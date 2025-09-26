<?php
/**
 * API de Segmentos - Versão Debug
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
header("Access-Control-Allow-Headers: Content-Type, Authorization, X-Empresa-ID, X-Requested-With");
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
    // Obter empresa_id (com fallback para desenvolvimento)
    $empresa_id = obterEmpresaId();
    if (!$empresa_id && DEVELOPMENT_MODE) {
        $empresa_id = 1; // ID padrão para desenvolvimento
    }
    
    if (!$empresa_id) {
        responderErro('ID da empresa não fornecido no cabeçalho X-Empresa-ID', 400);
    }

} catch (Exception $e) {
    error_log("Erro na inicialização da API de segmentos: " . $e->getMessage());
    responderErro('Erro interno do servidor: ' . $e->getMessage(), 500);
}

// Roteamento das requisições
$method = $_SERVER['REQUEST_METHOD'];
$id = $_GET['id'] ?? null;

switch ($method) {
    case 'GET':
        handleGet($conn, $empresa_id, $id);
        break;
        
    case 'POST':
        handlePost($conn, $empresa_id);
        break;
        
    case 'PUT':
        handlePut($conn, $empresa_id);
        break;
        
    case 'DELETE':
    $id = $_GET['id'] ?? null;
    $empresaId = $_SERVER['HTTP_X_EMPRESA_ID'] ?? null;

    if ($id && $empresaId) {
        $stmt = $conn->prepare("DELETE FROM segmentos WHERE id = ? AND empresa_id = ?");
        $stmt->bind_param("ii", $id, $empresaId);

        if ($stmt->execute()) {
            echo json_encode(["success" => true, "message" => "Segmento excluído com sucesso"]);
        } else {
            echo json_encode(["success" => false, "error" => "Erro ao excluir segmento: " . $stmt->error]);
        }
    } else {
        echo json_encode(["success" => false, "error" => "ID ou Empresa inválido"]);
    }
    break;

        
    default:
        responderErro('Método não permitido', 405);
        break;
}

/**
 * Listar segmentos ou buscar por ID
 */
function handleGet($conn, $empresa_id, $id) {
    try {
        if ($id) {
            // Buscar segmento específico
            $stmt = $conn->prepare("
                SELECT id, nome, descricao, ativo, criado_em, atualizado_em
                FROM segmentos 
                WHERE id = ? AND empresa_id = ? AND removido_em IS NULL
            ");
            if (!$stmt) {
                responderErro("Erro na preparação da consulta: " . $conn->error, 500);
            }
            $stmt->bind_param("ii", $id, $empresa_id);
            $stmt->execute();
            $result = $stmt->get_result();
            $segmento = $result->fetch_assoc();
            
            if (!$segmento) {
                responderErro('Segmento não encontrado', 404);
            }
            
            // Converter ativo para boolean
            $segmento['ativo'] = (bool)$segmento['ativo'];
            
            responderSucesso('Segmento encontrado', $segmento);
            
        } else {
            // Listar todos os segmentos
            $stmt = $conn->prepare("
                SELECT id, nome, descricao, ativo, criado_em, atualizado_em
                FROM segmentos 
                WHERE empresa_id = ? AND removido_em IS NULL 
                ORDER BY id DESC
            ");
            if (!$stmt) {
                responderErro("Erro na preparação da consulta: " . $conn->error, 500);
            }
            $stmt->bind_param("i", $empresa_id);
            $stmt->execute();
            $result = $stmt->get_result();
            $segmentos = $result->fetch_all(MYSQLI_ASSOC);
            
            // Converter ativo para boolean em todos os registros
            foreach ($segmentos as &$segmento) {
                $segmento['ativo'] = (bool)$segmento['ativo'];
            }
            
            responderSucesso('Segmentos listados com sucesso', $segmentos);
        }
        
    } catch (Exception $e) {
        error_log("Erro ao buscar segmentos: " . $e->getMessage());
        responderErro('Erro ao buscar segmentos: ' . $e->getMessage(), 500);
    }
}

/**
 * Criar novo segmento
 */
function handlePost($conn, $empresa_id) {
    try {
        $input = json_decode(file_get_contents('php://input'), true);
        
        // Validar dados obrigatórios
        if (!$input || !isset($input['nome']) || empty(trim($input['nome']))) {
            responderErro('Nome do segmento é obrigatório', 400);
        }
        
        $nome = trim($input['nome']);
        $descricao = isset($input['descricao']) ? trim($input['descricao']) : '';
        $ativo = isset($input['ativo']) ? (int)$input['ativo'] : 1;
        
        // Verificar se já existe segmento com mesmo nome na empresa
        $stmt = $conn->prepare("
            SELECT id FROM segmentos 
            WHERE nome = ? AND empresa_id = ? AND removido_em IS NULL
        ");
        if (!$stmt) {
            responderErro("Erro na preparação da consulta: " . $conn->error, 500);
        }
        $stmt->bind_param("si", $nome, $empresa_id);
        $stmt->execute();
        $result = $stmt->get_result();
        
        if ($result->num_rows > 0) {
            responderErro('Já existe um segmento com este nome', 409);
        }
        
        // Inserir novo segmento
        $stmt = $conn->prepare("
            INSERT INTO segmentos (nome, descricao, ativo, empresa_id) 
            VALUES (?, ?, ?, ?)
        ");
        if (!$stmt) {
            responderErro("Erro na preparação da consulta: " . $conn->error, 500);
        }
        $stmt->bind_param("ssii", $nome, $descricao, $ativo, $empresa_id);
        
        if ($stmt->execute()) {
            $lastId = $conn->insert_id;
            
            // Buscar o registro criado para retornar
            $stmt = $conn->prepare("
                SELECT id, nome, descricao, ativo, criado_em, atualizado_em
                FROM segmentos 
                WHERE id = ?
            ");
            $stmt->bind_param("i", $lastId);
            $stmt->execute();
            $result = $stmt->get_result();
            $segmento = $result->fetch_assoc();
            $segmento['ativo'] = (bool)$segmento['ativo'];
            
            responderSucesso('Segmento criado com sucesso', $segmento, 201);
        } else {
            responderErro('Erro ao criar segmento: ' . $stmt->error, 500);
        }
        
    } catch (Exception $e) {
        error_log("Erro ao criar segmento: " . $e->getMessage());
        responderErro('Dados inválidos: ' . $e->getMessage(), 400);
    }
}

/**
 * Atualizar segmento
 */
function handlePut($conn, $empresa_id) {
    try {
        $input = json_decode(file_get_contents('php://input'), true);

        // O ID é lido do corpo da requisição
        if (!isset($input['id'])) {
            responderErro('ID do segmento é obrigatório', 400);
        }
        $id = $input['id'];
        
        // Verificar se o segmento existe
        $stmt = $conn->prepare("
            SELECT id FROM segmentos 
            WHERE id = ? AND empresa_id = ? AND removido_em IS NULL
        ");
        if (!$stmt) {
            responderErro("Erro na preparação da consulta: " . $conn->error, 500);
        }
        $stmt->bind_param("ii", $id, $empresa_id);
        $stmt->execute();
        $result = $stmt->get_result();
        
        if ($result->num_rows === 0) {
            responderErro('Segmento não encontrado', 404);
        }
        
        // Verificar nome único (se fornecido)
        if (isset($input['nome']) && !empty(trim($input['nome']))) {
            $nome = trim($input['nome']);
            $stmt = $conn->prepare("
                SELECT id FROM segmentos 
                WHERE nome = ? AND empresa_id = ? AND id != ? AND removido_em IS NULL
            ");
            if (!$stmt) {
                responderErro("Erro na preparação da consulta: " . $conn->error, 500);
            }
            $stmt->bind_param("sii", $nome, $empresa_id, $id);
            $stmt->execute();
            $result = $stmt->get_result();
            
            if ($result->num_rows > 0) {
                responderErro('Já existe outro segmento com este nome', 409);
            }
        }
        
        // Preparar campos para atualização
        $fields = [];
        $params = [];
        $types = '';
        
        $allowed_fields = ['nome', 'descricao', 'ativo'];
        
        foreach ($input as $key => $value) {
            if (in_array($key, $allowed_fields)) {
                if ($key === 'nome' || $key === 'descricao') {
                    $value = trim($value);
                    $types .= 's';
                }
                if ($key === 'ativo') {
                    $value = (int)$value;
                    $types .= 'i';
                }
                
                $fields[] = "{$key} = ?";
                $params[] = $value;
            }
        }
        
        if (empty($fields)) {
            responderErro('Nenhum campo válido para atualizar', 400);
        }
        
        $types .= 'ii';
        $params[] = $id;
        $params[] = $empresa_id;
        
        // Atualizar segmento
        $sql = "UPDATE segmentos SET " . implode(', ', $fields) . " WHERE id = ? AND empresa_id = ?";
        $stmt = $conn->prepare($sql);
        if (!$stmt) {
            responderErro("Erro na preparação da consulta: " . $conn->error, 500);
        }
        $stmt->bind_param($types, ...$params);
        
        if ($stmt->execute()) {
            // Buscar o registro atualizado para retornar
            $stmt = $conn->prepare("
                SELECT id, nome, descricao, ativo, criado_em, atualizado_em
                FROM segmentos 
                WHERE id = ? AND empresa_id = ?
            ");
            $stmt->bind_param("ii", $id, $empresa_id);
            $stmt->execute();
            $result = $stmt->get_result();
            $segmento = $result->fetch_assoc();
            $segmento['ativo'] = (bool)$segmento['ativo'];
            
            responderSucesso('Segmento atualizado com sucesso', $segmento);
        } else {
            responderErro('Erro ao atualizar segmento: ' . $stmt->error, 500);
        }
        
    } catch (Exception $e) {
        error_log("Erro geral ao atualizar segmento: " . $e->getMessage());
        responderErro('Dados inválidos: ' . $e->getMessage(), 400);
    }
}

/**
 * Excluir segmento (soft delete) - Versão Debug
 */
function handleDelete($conn, $empresa_id) {
    try {
        // CORREÇÃO: Pega o ID da URL, não do corpo da requisição
        if (!isset($_GET['id'])) {
            responderErro('ID do segmento é obrigatório', 400);
        }
        $id = (int)$_GET['id'];
        
        // Verificar se o segmento existe
        $stmt = $conn->prepare("
            SELECT id FROM segmentos 
            WHERE id = ? AND empresa_id = ? AND removido_em IS NULL
        ");
        if (!$stmt) {
            responderErro("Erro na preparação da consulta: " . $conn->error, 500);
        }
        $stmt->bind_param("ii", $id, $empresa_id);
        $stmt->execute();
        $result = $stmt->get_result();
        
        if ($result->num_rows === 0) {
            responderErro('Segmento não encontrado', 404);
        }
        
        // Verificar se o segmento está sendo usado por clientes
        $stmt_check = $conn->prepare("
            SELECT COUNT(*) as count FROM clientes 
            WHERE segmento_id = ? AND empresa_id = ? AND removido_em IS NULL
        ");
        if (!$stmt_check) {
            responderErro("Erro na preparação da consulta de dependência: " . $conn->error, 500);
        }
        $stmt_check->bind_param("ii", $id, $empresa_id);
        $stmt_check->execute();
        $result_check = $stmt_check->get_result();
        $count = $result_check->fetch_assoc()['count'];
        
        if ($count > 0) {
            responderErro('Não é possível excluir este segmento pois ele está sendo usado por ' . $count . ' cliente(s).', 409);
        }
        
        // Realizar soft delete
        $stmt_delete = $conn->prepare("
            UPDATE segmentos 
            SET removido_em = NOW() 
            WHERE id = ? AND empresa_id = ?
        ");
        if (!$stmt_delete) {
            responderErro("Erro na preparação da consulta de exclusão: " . $conn->error, 500);
        }
        
        $stmt_delete->bind_param("ii", $id, $empresa_id);
        
        if ($stmt_delete->execute()) {
            responderSucesso('Segmento excluído com sucesso');
        } else {
            responderErro('Erro ao excluir segmento: ' . $stmt_delete->error, 500);
        }
        
    } catch (Exception $e) {
        responderErro('Erro ao excluir segmento: ' . $e->getMessage(), 500);
    }
}