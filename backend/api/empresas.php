<?php
/**
 * API de Empresas
 * Sistema de Gerenciamento de Atendimentos
 */

// Headers CORS mais permissivos - DEVE ser a primeira coisa no arquivo
header("Access-Control-Allow-Origin: *");
header("Access-Control-Allow-Methods: GET, POST, PUT, DELETE, OPTIONS");
header("Access-Control-Allow-Headers: Content-Type, Authorization, X-Requested-With, X-Empresa-ID");
header("Access-Control-Max-Age: 86400");
header("Content-Type: application/json; charset=UTF-8");

// Tratar requisições OPTIONS (preflight)
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit();
}

// Habilitar exibição de erros para debug
ini_set('display_errors', 1);
ini_set('display_startup_errors', 1);
error_reporting(E_ALL);

// Definir modo de desenvolvimento
define('DEVELOPMENT_MODE', true);

// Incluir configurações
require_once __DIR__ . "/../config/db.php";
require_once __DIR__ . "/../config/util.php";

// Roteamento das requisições
$method = $_SERVER['REQUEST_METHOD'];
$id = $_GET['id'] ?? null;

switch ($method) {
    case 'GET':
        handleGet($conn, $id);
        break;

    case 'POST':
        handlePost($conn);
        break;

    case 'PUT':
        handlePut($conn);
        break;

    case 'DELETE':
        handleDelete($conn, $id);
        break;

    default:
        responderErro('Método não permitido', 405);
        break;
}

/**
 * Listar empresas ou buscar por ID
 */
function handleGet($conn, $id) {
    try {
        if ($id) {
            // Buscar empresa específica
            $stmt = $conn->prepare("
                SELECT id, nome, cnpj, email, telefone, endereco, cidade, estado, cep, ativo, criado_em, atualizado_em
                FROM empresas
                WHERE id = ? AND removido_em IS NULL
            ");
            if (!$stmt) {
                responderErro("Erro na preparação da consulta: " . $conn->error, 500);
            }
            $stmt->bind_param("i", $id);
            $stmt->execute();
            $result = $stmt->get_result();
            $empresa = $result->fetch_assoc();
            
            if (!$empresa) {
                responderErro('Empresa não encontrada', 404);
            }

            // Garante que o status seja retornado como um número
            $empresa['ativo'] = (int)$empresa['ativo'];
            
            responderSucesso('Empresa encontrada', $empresa);
            
        } else {
            // Listar todas as empresas, com opção de filtrar por status
            $filtro_status = isset($_GET['status']) && $_GET['status'] === 'ativo' ? " AND ativo = 1" : "";

            $stmt = $conn->prepare("
                SELECT id, nome, cnpj, email, telefone, endereco, cidade, estado, cep, ativo, criado_em, atualizado_em
                FROM empresas
                WHERE removido_em IS NULL {$filtro_status}
                ORDER BY id DESC
            ");
            if (!$stmt) {
                responderErro("Erro na preparação da consulta: " . $conn->error, 500);
            }
            $stmt->execute();
            $result = $stmt->get_result();
            $empresas = $result->fetch_all(MYSQLI_ASSOC);

            // Ajustar o campo ativo para int
            foreach ($empresas as &$empresa) {
                $empresa['ativo'] = (int)$empresa['ativo'];
            }
            
            responderSucesso('Empresas listadas com sucesso', $empresas);
        }
        
    } catch (Exception $e) {
        error_log("Erro ao buscar empresas: " . $e->getMessage());
        responderErro('Erro ao buscar empresas: ' . $e->getMessage(), 500);
    }
}

/**
 * Criar nova empresa
 */
function handlePost($conn) {
    try {
        $input = json_decode(file_get_contents('php://input'), true);

        // Validar dados obrigatórios
        if (!$input || !isset($input['nome']) || empty(trim($input['nome']))) {
            responderErro('Nome da empresa é obrigatório', 400);
        }

        $nome = trim($input['nome']);
        $cnpj = isset($input['cnpj']) ? trim($input['cnpj']) : null;
        $email = isset($input['email']) ? trim($input['email']) : null;
        $telefone = isset($input['telefone']) ? trim($input['telefone']) : null;
        $endereco = isset($input['endereco']) ? trim($input['endereco']) : null;
        $cidade = isset($input['cidade']) ? trim($input['cidade']) : null;
        $estado = isset($input['estado']) ? trim($input['estado']) : null;
        $cep = isset($input['cep']) ? trim($input['cep']) : null;
        $ativo = isset($input['ativo']) ? (int)$input['ativo'] : 1;

        // Validar CNPJ se fornecido
        if ($cnpj) {
            $cnpj_limpo = preg_replace('/\D/', '', $cnpj);
            if (!validarCNPJ($cnpj_limpo)) {
                responderErro('CNPJ inválido', 400);
            }

            // Verificar se CNPJ já existe
            $stmt = $conn->prepare("
                SELECT id FROM empresas 
                WHERE cnpj = ? AND removido_em IS NULL
            ");
            if (!$stmt) {
                responderErro("Erro na preparação da consulta: " . $conn->error, 500);
            }
            $stmt->bind_param("s", $cnpj_limpo);
            $stmt->execute();
            $result = $stmt->get_result();
            if ($result->num_rows > 0) {
                responderErro('CNPJ já cadastrado para outra empresa', 409);
            }

            $cnpj = $cnpj_limpo;
        }

        // Inserir nova empresa
        $stmt = $conn->prepare("
            INSERT INTO empresas (nome, cnpj, email, telefone, endereco, cidade, estado, cep, ativo) 
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
        ");
        if (!$stmt) {
            responderErro("Erro na preparação da consulta: " . $conn->error, 500);
        }

        $stmt->bind_param("ssssssssi", 
            $nome, $cnpj, $email, $telefone, $endereco, $cidade, $estado, $cep, $ativo
        );

        if ($stmt->execute()) {
            $lastId = $conn->insert_id;

            // Buscar a empresa criada para retornar
            $stmt = $conn->prepare("
                SELECT id, nome, cnpj, email, telefone, endereco, cidade, estado, cep, ativo, criado_em, atualizado_em
                FROM empresas 
                WHERE id = ?
            ");
            if (!$stmt) {
                responderErro("Erro na preparação da consulta: " . $conn->error, 500);
            }
            $stmt->bind_param("i", $lastId);
            $stmt->execute();
            $result = $stmt->get_result();
            $empresa = $result->fetch_assoc();
            $empresa['ativo'] = (int)$empresa['ativo'];

            responderSucesso('Empresa criada com sucesso', $empresa, 201);
        } else {
            responderErro('Erro ao criar empresa: ' . $stmt->error, 500);
        }

    } catch (Exception $e) {
        error_log("Erro ao criar empresa: " . $e->getMessage());
        responderErro('Dados inválidos: ' . $e->getMessage(), 400);
    }
}

/**
 * Atualizar empresa
 */
function handlePut($conn) {
    try {
        $input = json_decode(file_get_contents('php://input'), true);

        if (!isset($input['id'])) {
            responderErro('ID da empresa é obrigatório', 400);
        }
        $id = $input['id'];

        // Verificar se a empresa existe
        $stmt = $conn->prepare("
            SELECT id FROM empresas 
            WHERE id = ? AND removido_em IS NULL
        ");
        if (!$stmt) {
            responderErro("Erro na preparação da consulta: " . $conn->error, 500);
        }
        $stmt->bind_param("i", $id);
        $stmt->execute();
        $result = $stmt->get_result();

        if ($result->num_rows === 0) {
            responderErro('Empresa não encontrada', 404);
        }

        // Preparar campos para atualização
        $fields = [];
        $params = [];
        $types = '';

        $allowed_fields = ['nome', 'cnpj', 'email', 'telefone', 'endereco', 'cidade', 'estado', 'cep', 'ativo'];

        foreach ($input as $key => $value) {
            if (in_array($key, $allowed_fields)) {
                if (in_array($key, ['nome']) && empty(trim($value))) {
                    responderErro('Nome não pode ser vazio', 400);
                }

                if ($key === 'cnpj' && $value !== null) {
                    $cnpj_limpo = preg_replace('/\D/', '', $value);
                    if (!validarCNPJ($cnpj_limpo)) {
                        responderErro('CNPJ inválido', 400);
                    }
                    $value = $cnpj_limpo;

                    // Verificar duplicidade de CNPJ para outra empresa
                    $stmtCheck = $conn->prepare("
                        SELECT id FROM empresas WHERE cnpj = ? AND id != ? AND removido_em IS NULL
                    ");
                    if (!$stmtCheck) {
                        responderErro("Erro na preparação da consulta: " . $conn->error, 500);
                    }
                    $stmtCheck->bind_param("si", $value, $id);
                    $stmtCheck->execute();
                    $resCheck = $stmtCheck->get_result();
                    if ($resCheck->num_rows > 0) {
                        responderErro('CNPJ já cadastrado para outra empresa', 409);
                    }
                }

                if ($key === 'ativo') {
                    $value = (int)$value;
                }

                $fields[] = "$key = ?";
                $params[] = $value;
                $types .= 's';
            }
        }

        if (empty($fields)) {
            responderErro('Nenhum campo válido para atualizar', 400);
        }

        // Construir SQL de update
        $sql = "UPDATE empresas SET " . implode(', ', $fields) . ", atualizado_em = NOW() WHERE id = ?";
        $stmt = $conn->prepare($sql);
        if (!$stmt) {
            responderErro("Erro na preparação da consulta: " . $conn->error, 500);
        }

        // Adicionar tipos e parâmetros do WHERE
        $types .= 'i';
        $params[] = $id;

        // Preparar bind_param com call_user_func_array
        $bind_names[] = $types;
        for ($i=0; $i<count($params); $i++) {
            $bind_names[] = &$params[$i];
        }
        call_user_func_array([$stmt, 'bind_param'], $bind_names);

        if (!$stmt->execute()) {
            responderErro('Erro ao atualizar empresa: ' . $stmt->error, 500);
        }

        responderSucesso('Empresa atualizada com sucesso');

    } catch (Exception $e) {
        error_log("Erro ao atualizar empresa: " . $e->getMessage());
        responderErro('Erro ao atualizar empresa: ' . $e->getMessage(), 500);
    }
}

/**
 * Remover empresa (soft delete)
 */
function handleDelete($conn, $id) {
    try {
        if (!$id) {
            responderErro('ID da empresa não fornecido na URL.', 400);
        }

        // Verificar se empresa existe
        $stmt = $conn->prepare("
            SELECT id FROM empresas 
            WHERE id = ? AND removido_em IS NULL
        ");
        if (!$stmt) {
            responderErro("Erro na preparação da consulta: " . $conn->error, 500);
        }
        $stmt->bind_param("i", $id);
        $stmt->execute();
        $result = $stmt->get_result();

        if ($result->num_rows === 0) {
            responderErro('Empresa não encontrada ou já removida', 404);
        }

        // Soft delete - marcar removido_em
        $stmt = $conn->prepare("
            UPDATE empresas SET removido_em = NOW() WHERE id = ?
        ");
        if (!$stmt) {
            responderErro("Erro na preparação da consulta: " . $conn->error, 500);
        }
        $stmt->bind_param("i", $id);
        if ($stmt->execute()) {
            responderSucesso('Empresa removida com sucesso');
        } else {
            responderErro('Erro ao remover empresa: ' . $stmt->error, 500);
        }

    } catch (Exception $e) {
        error_log("Erro ao remover empresa: " . $e->getMessage());
        responderErro('Erro ao remover empresa: ' . $e->getMessage(), 500);
    }
}

/**
 * Validar CNPJ
 */
function validarCNPJ($cnpj) {
    if (strlen($cnpj) != 14) {
        return false;
    }

    $tamanho = strlen($cnpj) - 2;
    $numeros = substr($cnpj, 0, $tamanho);
    $digitos = substr($cnpj, $tamanho);
    $soma = 0;
    $pos = $tamanho - 7;

    for ($i = $tamanho; $i >= 1; $i--) {
        $soma += $numeros[$tamanho - $i] * $pos--;
        if ($pos < 2) {
            $pos = 9;
        }
    }

    $resultado = ($soma % 11) < 2 ? 0 : 11 - ($soma % 11);
    if ($resultado != $digitos[0]) {
        return false;
    }

    $tamanho += 1;
    $numeros = substr($cnpj, 0, $tamanho);
    $soma = 0;
    $pos = $tamanho - 7;

    for ($i = $tamanho; $i >= 1; $i--) {
        $soma += $numeros[$tamanho - $i] * $pos--;
        if ($pos < 2) {
            $pos = 9;
        }
    }

    $resultado = ($soma % 11) < 2 ? 0 : 11 - ($soma % 11);
    if ($resultado != $digitos[1]) {
        return false;
    }

    return true;
}
?>

