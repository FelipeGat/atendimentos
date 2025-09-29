<?php
/**
 * API de Usuários
 * Sistema de Gerenciamento de Atendimentos
 */

// Habilitar exibição de erros para debug
ini_set('display_errors', 1);
ini_set('display_startup_errors', 1);
error_reporting(E_ALL);

// Definir modo de desenvolvimento
define('DEVELOPMENT_MODE', true);

// Definir cabeçalhos CORS
header("Content-Type: application/json; charset=UTF-8");
// Em produção, considere uma lista de origens permitidas em vez de '*'
header("Access-Control-Allow-Origin: *");
header("Access-Control-Allow-Methods: GET, POST, PUT, DELETE, OPTIONS");
header("Access-Control-Allow-Headers: Content-Type, Authorization, X-Empresa-ID, X-Requested-With, X-HTTP-Method-Override");
header("Access-Control-Allow-Credentials: true");

// Tratar requisição OPTIONS (pré-flight CORS)
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit;
}

// Incluir configurações
require_once __DIR__ . "/../config/db.php";
require_once __DIR__ . "/../config/util.php";

// Inicialização da conexão
$conn = null;
try {
    $conn = getConnection(); // <-- CORREÇÃO: Inicializa a conexão
    if (!$conn) {
        throw new Exception("Falha ao obter conexão com o banco de dados.");
    }

    $empresa_id = obterEmpresaId();
    if (!$empresa_id && DEVELOPMENT_MODE) {
        $empresa_id = 1;
    }

    // A verificação de empresa_id pode não ser necessária para todos os endpoints de usuário
    // if (!$empresa_id) {
    //     responderErro('ID da empresa não fornecido no cabeçalho X-Empresa-ID', 400);
    // }

} catch (Exception $e) {
    error_log("Erro na inicialização da API de usuários: " . $e->getMessage());
    responderErro('Erro interno do servidor', 500);
}

// Roteamento
$method = $_SERVER['REQUEST_METHOD'];
$id = $_GET['id'] ?? null;

// Suporte a X-HTTP-Method-Override
if ($method === 'POST' && isset($_SERVER['HTTP_X_HTTP_METHOD_OVERRIDE'])) {
    $method = strtoupper($_SERVER['HTTP_X_HTTP_METHOD_OVERRIDE']);
}

switch ($method) {
    case 'GET':
        handleGet($conn, $empresa_id, $id);
        break;

    case 'POST':
        handlePost($conn, $empresa_id);
        break;

    case 'PUT':
        handlePut($conn, $empresa_id, $id);
        break;

    case 'DELETE':
        handleDelete($conn, $empresa_id, $id);
        break;

    default:
        responderErro('Método não permitido', 405);
        break;
}

/**
 * Buscar usuário(s)
 */
function handleGet($conn, $empresa_id, $id) {
    try {
        if ($id) {
            $stmt = $conn->prepare("
                SELECT id, nome, cpf, email, telefone, bloqueado, perfil, foto, criado_em, atualizado_em
                FROM usuarios
                WHERE id = ? AND removido_em IS NULL
            ");
            $stmt->execute([$id]);
            $usuario = $stmt->fetch(PDO::FETCH_ASSOC);

            if ($usuario) {
                $usuario['bloqueado'] = (int)$usuario['bloqueado'];
                responderSucesso('Usuário encontrado', $usuario);
            } else {
                responderErro('Usuário não encontrado', 404);
            }

        } else {
            $stmt = $conn->prepare("
                SELECT id, nome, cpf, email, telefone, bloqueado, perfil, foto, criado_em, atualizado_em
                FROM usuarios
                WHERE removido_em IS NULL
                ORDER BY nome ASC
            ");
            $stmt->execute();
            $usuarios = $stmt->fetchAll(PDO::FETCH_ASSOC);

            // Assegurar que 'bloqueado' seja um inteiro para consistência no frontend
            foreach ($usuarios as &$usuario) {
                $usuario['bloqueado'] = (int)$usuario['bloqueado'];
            }

            responderSucesso('Usuários listados com sucesso', $usuarios);
        }

    } catch (Exception $e) {
        error_log("Erro ao buscar usuários: " . $e->getMessage());
        responderErro('Erro interno ao buscar usuários', 500);
    }
}

/**
 * Criar novo usuário
 */
function handlePost($conn, $empresa_id) {
    try {
        $nome       = $_POST['nome'] ?? null;
        $cpf        = isset($_POST['cpf']) ? preg_replace('/\D/', '', $_POST['cpf']) : null;
        $email      = isset($_POST['email']) ? strtolower(trim($_POST['email'])) : null;
        $telefone   = $_POST['telefone'] ?? null;
        $senha      = $_POST['senha'] ?? null;
        $perfil     = $_POST['perfil'] ?? 'Usuario';
        $bloqueado  = isset($_POST['bloqueado']) ? (int)$_POST['bloqueado'] : 0;

        // Upload da foto
        $fotoPath = salvarFoto($_FILES['foto'] ?? null);

        if (!$nome) responderErro('Nome é obrigatório', 400);
        if (!$email || !filter_var($email, FILTER_VALIDATE_EMAIL)) responderErro('Email inválido', 400);
        if (!$senha || strlen($senha) < 6) responderErro('Senha deve ter pelo menos 6 caracteres', 400);

        $perfis_validos = ['Admin', 'Tecnico', 'Usuario'];
        if (!in_array($perfil, $perfis_validos)) responderErro('Perfil inválido', 400);

        if ($cpf && strlen($cpf) !== 11) responderErro('CPF inválido', 400);

        // Duplicidade de Email
        $stmt = $conn->prepare("SELECT id FROM usuarios WHERE email = ? AND removido_em IS NULL");
        $stmt->execute([$email]);
        if ($stmt->fetch()) {
            responderErro('Já existe um usuário com este email', 409);
        }

        // Duplicidade de CPF
        if ($cpf) {
            $stmt = $conn->prepare("SELECT id FROM usuarios WHERE cpf = ? AND removido_em IS NULL");
            $stmt->execute([$cpf]);
            if ($stmt->fetch()) {
                responderErro('CPF já cadastrado', 409);
            }
        }

        $senha_hash = password_hash($senha, PASSWORD_DEFAULT);
        $stmt = $conn->prepare("
            INSERT INTO usuarios (nome, cpf, email, senha, telefone, bloqueado, perfil, foto)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        ");
        
        $params = [$nome, $cpf, $email, $senha_hash, $telefone, $bloqueado, $perfil, $fotoPath];

        if ($stmt->execute($params)) {
            responderSucesso('Usuário criado com sucesso', ['id' => $conn->lastInsertId()], 201);
        } else {
            $errorInfo = $stmt->errorInfo();
            responderErro('Erro ao criar usuário: ' . ($errorInfo[2] ?? 'Erro desconhecido'), 500);
        }

    } catch (Exception $e) {
        responderErro('Erro interno: ' . $e->getMessage(), 500);
    }
}

function handlePut($conn, $empresa_id, $id) {
    // Como os dados vêm de um FormData, eles estarão em $_POST
    // e não em um raw body. A lógica de leitura está ok.
    try {
        if (!$id) responderErro('ID do usuário não fornecido', 400);

        $nome       = $_POST['nome'] ?? null;
        $cpf        = isset($_POST['cpf']) ? preg_replace('/\D/', '', $_POST['cpf']) : null;
        $email      = $_POST['email'] ?? null;
        $telefone   = $_POST['telefone'] ?? null;
        $senha      = $_POST['senha'] ?? null;
        $perfil     = $_POST['perfil'] ?? null;
        $bloqueado  = isset($_POST['bloqueado']) ? (int)$_POST['bloqueado'] : 0;

        if (!$nome) responderErro('Nome é obrigatório', 400);
        if (!$email || !filter_var($email, FILTER_VALIDATE_EMAIL)) responderErro('Email inválido', 400);

        $perfis_validos = ['Admin', 'Tecnico', 'Usuario'];
        if (!in_array($perfil, $perfis_validos)) responderErro('Perfil inválido', 400);

        if ($cpf && strlen($cpf) !== 11) responderErro('CPF inválido', 400);

        // Verifica usuário existente (PDO)
        $stmt = $conn->prepare("SELECT foto FROM usuarios WHERE id = ? AND removido_em IS NULL");
        $stmt->execute([$id]);
        $existing = $stmt->fetch(PDO::FETCH_ASSOC);
        if (!$existing) responderErro('Usuário não encontrado', 404);

        $oldFotoPath = $existing['foto'];

        // Upload nova foto
        $fotoPath = $oldFotoPath;
        if (!empty($_FILES['foto']['name'])) {
            if ($oldFotoPath && file_exists(__DIR__ . '/' . $oldFotoPath)) {
                unlink(__DIR__ . '/' . $oldFotoPath);
            }
            $fotoPath = salvarFoto($_FILES['foto']);
        }

        // Monta query (PDO)
        $query_parts = [];
        $params = [];

        $query_parts[] = "nome=?"; $params[] = $nome;
        $query_parts[] = "email=?"; $params[] = $email;
        $query_parts[] = "telefone=?"; $params[] = $telefone;
        $query_parts[] = "cpf=?"; $params[] = $cpf;
        $query_parts[] = "perfil=?"; $params[] = $perfil;
        $query_parts[] = "bloqueado=?"; $params[] = $bloqueado;
        $query_parts[] = "foto=?"; $params[] = $fotoPath;
        $query_parts[] = "atualizado_em=NOW()";

        if ($senha) {
            $senha_hash = password_hash($senha, PASSWORD_DEFAULT);
            $query_parts[] = "senha=?";
            $params[] = $senha_hash;
        }

        $params[] = $id; // Adiciona o ID para o WHERE

        $query = "UPDATE usuarios SET " . implode(", ", $query_parts) . " WHERE id=?";
        
        $stmt = $conn->prepare($query);

        if ($stmt->execute($params)) {
            // Busca o usuário atualizado para retornar na resposta (PDO)
            $stmt = $conn->prepare("
                SELECT id, nome, cpf, email, telefone, bloqueado, perfil, foto, criado_em, atualizado_em
                FROM usuarios
                WHERE id = ? AND removido_em IS NULL
            ");
            $stmt->execute([$id]);
            $updatedUser = $stmt->fetch(PDO::FETCH_ASSOC);
            
            if ($updatedUser) {
                $updatedUser['bloqueado'] = (int)$updatedUser['bloqueado'];
                responderSucesso('Usuário atualizado com sucesso', $updatedUser);
            } else {
                responderErro('Erro ao buscar usuário atualizado', 500);
            }
        } else {
            $errorInfo = $stmt->errorInfo();
            responderErro('Erro ao atualizar usuário: ' . ($errorInfo[2] ?? 'Erro desconhecido'), 500);
        }

    } catch (Exception $e) {
        responderErro('Erro interno ao atualizar: ' . $e->getMessage(), 500);
    }
}

/**
 * Remover usuário (soft delete)
 */
function handleDelete($conn, $empresa_id, $id) {
    try {
        if (!$id) responderErro('ID não fornecido', 400);

        // Verifica se o usuário existe antes de deletar (PDO)
        $stmt = $conn->prepare("SELECT id FROM usuarios WHERE id = ? AND removido_em IS NULL");
        $stmt->execute([$id]);
        if (!$stmt->fetch()) {
            responderErro('Usuário não encontrado', 404);
        }

        // Realiza o soft delete (PDO)
        $stmt = $conn->prepare("UPDATE usuarios SET removido_em = NOW() WHERE id = ?");
        if ($stmt->execute([$id])) {
            responderSucesso('Usuário removido com sucesso');
        } else {
            $errorInfo = $stmt->errorInfo();
            responderErro('Erro ao remover usuário: ' . ($errorInfo[2] ?? 'Erro desconhecido'), 500);
        }

    } catch (Exception $e) {
        responderErro('Erro interno ao remover: ' . $e->getMessage(), 500);
    }
}

/**
 * Função auxiliar para salvar foto
 */
function salvarFoto($file) {
    if (!$file || empty($file['name'])) return null;

    $uploadDir = __DIR__ . '/uploads/';
    if (!file_exists($uploadDir)) {
        mkdir($uploadDir, 0777, true);
    }

    $fileName   = time() . '_' . basename($file['name']);
    $targetFile = $uploadDir . $fileName;

    if (move_uploaded_file($file['tmp_name'], $targetFile)) {
        return 'uploads/' . $fileName;
    }

    return null;
}