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
header("Access-Control-Allow-Origin: http://localhost:3000");
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

try {
    $empresa_id = obterEmpresaId();
    if (!$empresa_id && DEVELOPMENT_MODE) {
        $empresa_id = 1;
    }

    if (!$empresa_id) {
        responderErro('ID da empresa não fornecido no cabeçalho X-Empresa-ID', 400);
    }

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
            $stmt->bind_param("i", $id);
            $stmt->execute();
            $usuario = $stmt->get_result()->fetch_assoc();

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
            $result = $stmt->get_result();
            $usuarios = [];

            while ($row = $result->fetch_assoc()) {
                $row['bloqueado'] = (int)$row['bloqueado'];
                $usuarios[] = $row;
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

        // Duplicidade
        $stmt = $conn->prepare("SELECT id FROM usuarios WHERE email = ? AND removido_em IS NULL");
        $stmt->bind_param("s", $email);
        $stmt->execute();
        if ($stmt->get_result()->num_rows > 0) responderErro('Já existe um usuário com este email', 409);

        if ($cpf) {
            $stmt = $conn->prepare("SELECT id FROM usuarios WHERE cpf = ? AND removido_em IS NULL");
            $stmt->bind_param("s", $cpf);
            $stmt->execute();
            if ($stmt->get_result()->num_rows > 0) responderErro('CPF já cadastrado', 409);
        }

        $senha_hash = password_hash($senha, PASSWORD_DEFAULT);
        $stmt = $conn->prepare("
            INSERT INTO usuarios (nome, cpf, email, senha, telefone, bloqueado, perfil, foto)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        ");
        $stmt->bind_param("sssssiis", $nome, $cpf, $email, $senha_hash, $telefone, $bloqueado, $perfil, $fotoPath);

        if ($stmt->execute()) {
            responderSucesso('Usuário criado com sucesso', ['id' => $conn->insert_id], 201);
        } else {
            responderErro('Erro ao criar usuário: ' . $stmt->error, 500);
        }

    } catch (Exception $e) {
        responderErro('Erro interno: ' . $e->getMessage(), 500);
    }
}

/**
 * Atualizar usuário
 */
function handlePut($conn, $empresa_id, $id) {
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

        // Verifica usuário existente
        $stmt = $conn->prepare("SELECT foto FROM usuarios WHERE id = ? AND removido_em IS NULL");
        $stmt->bind_param("i", $id);
        $stmt->execute();
        $existing = $stmt->get_result()->fetch_assoc();
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

        // Monta query
        $query = "UPDATE usuarios SET nome=?, email=?, telefone=?, cpf=?, perfil=?, bloqueado=?, foto=?, atualizado_em=NOW()";
        $params = "ssssiis";
        $data = [$nome, $email, $telefone, $cpf, $perfil, $bloqueado, $fotoPath];

        if ($senha) {
            $senha_hash = password_hash($senha, PASSWORD_DEFAULT);
            $query .= ", senha=?";
            $params .= "s";
            $data[] = $senha_hash;
        }

        $query .= " WHERE id=?";
        $params .= "i";
        $data[] = $id;

        $stmt = $conn->prepare($query);
        $stmt->bind_param($params, ...$data);

        if ($stmt->execute()) {
            // Busca o usuário atualizado para retornar na resposta
            $stmt = $conn->prepare("
                SELECT id, nome, cpf, email, telefone, bloqueado, perfil, foto, criado_em, atualizado_em
                FROM usuarios
                WHERE id = ? AND removido_em IS NULL
            ");
            $stmt->bind_param("i", $id);
            $stmt->execute();
            $updatedUser = $stmt->get_result()->fetch_assoc();
            
            if ($updatedUser) {
                $updatedUser['bloqueado'] = (int)$updatedUser['bloqueado'];
                // Retorna o objeto completo do usuário
                responderSucesso('Usuário atualizado com sucesso', $updatedUser);
            } else {
                responderErro('Erro ao buscar usuário atualizado', 500);
            }
        } else {
            responderErro('Erro ao atualizar usuário: ' . $stmt->error, 500);
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

        $stmt = $conn->prepare("SELECT id FROM usuarios WHERE id = ? AND removido_em IS NULL");
        $stmt->bind_param("i", $id);
        $stmt->execute();
        if ($stmt->get_result()->num_rows === 0) {
            responderErro('Usuário não encontrado', 404);
        }

        $stmt = $conn->prepare("UPDATE usuarios SET removido_em = NOW() WHERE id = ?");
        $stmt->bind_param("i", $id);
        if ($stmt->execute()) {
            responderSucesso('Usuário removido com sucesso');
        } else {
            responderErro('Erro ao remover usuário: ' . $stmt->error, 500);
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