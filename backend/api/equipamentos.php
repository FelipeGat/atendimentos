<?php
/**
 * API de Equipamentos
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
    // Obter e validar empresa_id
    $empresa_id = obterEmpresaId();
    if (!$empresa_id && DEVELOPMENT_MODE) {
        $empresa_id = 1; // ID padrão para desenvolvimento
    }
    
    if (!$empresa_id) {
        responderErro('ID da empresa não fornecido no cabeçalho X-Empresa-ID', 400);
    }

} catch (Exception $e) {
    error_log("Erro na inicialização da API de equipamentos: " . $e->getMessage());
    responderErro('Erro interno do servidor', 500);
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
        handleDelete($conn, $empresa_id, $id);
        break;
        
    default:
        responderErro('Método não permitido', 405);
        break;
}

/**
 * Listar equipamentos ou buscar por ID
 */
function handleGet($conn, $empresa_id, $id) {
    try {
        if ($id) {
            // Buscar equipamento específico
            $stmt = $conn->prepare("
                SELECT e.*, c.nome AS nome_cliente 
                FROM equipamentos e
                LEFT JOIN clientes c ON e.cliente_id = c.id
                WHERE e.id = ? AND e.empresa_id = ? AND e.removido_em IS NULL
            ");
            if (!$stmt) {
                responderErro("Erro na preparação da consulta: " . $conn->error, 500);
            }
            $stmt->bind_param("ii", $id, $empresa_id);
            $stmt->execute();
            $result = $stmt->get_result();
            $equipamento = $result->fetch_assoc();
            
            if (!$equipamento) {
                responderErro('Equipamento não encontrado', 404);
            }
            
            // Converter ativo para boolean
            // $equipamento['status'] = (bool)$equipamento['status'];
            
            responderSucesso('Equipamento encontrado', $equipamento);
            
        } else {
            // Listar todos os equipamentos
            $stmt = $conn->prepare("
                SELECT e.*, c.nome AS nome_cliente 
                FROM equipamentos e
                LEFT JOIN clientes c ON e.cliente_id = c.id
                WHERE e.empresa_id = ? AND e.removido_em IS NULL 
                ORDER BY e.id DESC
            ");
            if (!$stmt) {
                responderErro("Erro na preparação da consulta: " . $conn->error, 500);
            }
            $stmt->bind_param("i", $empresa_id);
            $stmt->execute();
            $result = $stmt->get_result();
            $equipamentos = $result->fetch_all(MYSQLI_ASSOC);
            
            // Converter ativo para boolean em todos os registros
            foreach ($equipamentos as &$equipamento) {
                // $equipamento['status'] = (bool)$equipamento['status'];
            }
            
            responderSucesso('Equipamentos listados com sucesso', $equipamentos);
        }
        
    } catch (Exception $e) {
        error_log("Erro ao buscar equipamentos: " . $e->getMessage());
        responderErro('Erro ao buscar equipamentos: ' . $e->getMessage(), 500);
    }
}

/**
 * Criar novo equipamento
 */
function handlePost($conn, $empresa_id) {
    try {
        $input = json_decode(file_get_contents('php://input'), true);
        
        // Validar dados obrigatórios
        if (!$input || !isset($input['nome']) || empty(trim($input['nome']))) {
            responderErro('Nome do equipamento é obrigatório', 400);
        }
        
        $nome = trim($input['nome']);
        $marca = isset($input['marca']) ? trim($input['marca']) : null;
        $modelo = isset($input['modelo']) ? trim($input['modelo']) : null;
        $numero_serie = isset($input['numero_serie']) ? trim($input['numero_serie']) : null;
        $patrimonio = isset($input['patrimonio']) ? trim($input['patrimonio']) : null;
        $cliente_id = isset($input['cliente_id']) ? (int)$input['cliente_id'] : null;
        $descricao = isset($input['descricao']) ? trim($input['descricao']) : null;
        $data_aquisicao = isset($input['data_aquisicao']) ? trim($input['data_aquisicao']) : null;
        $valor_aquisicao = isset($input['valor_aquisicao']) ? (float)$input['valor_aquisicao'] : null;
        $garantia_ate = isset($input['garantia_ate']) ? trim($input['garantia_ate']) : null;
        $localizacao = isset($input['localizacao']) ? trim($input['localizacao']) : null;
        $status = isset($input['status']) ? (int)$input['status'] : 1;
        
        // Inserir novo equipamento
        $stmt = $conn->prepare("
            INSERT INTO equipamentos (nome, marca, modelo, numero_serie, patrimonio, cliente_id, descricao, data_aquisicao, valor_aquisicao, garantia_ate, localizacao, status, empresa_id) 
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        ");
        if (!$stmt) {
            responderErro("Erro na preparação da consulta: " . $conn->error, 500);
        }
        
        $stmt->bind_param("sssssiisdssii", 
            $nome, $marca, $modelo, $numero_serie, $patrimonio, $cliente_id, $descricao, $data_aquisicao, $valor_aquisicao, $garantia_ate, $localizacao, $status, $empresa_id
        );
        
        if ($stmt->execute()) {
            $lastId = $conn->insert_id;
            
            // Buscar o registro criado para retornar
            $stmt = $conn->prepare("
                SELECT e.*, c.nome AS nome_cliente 
                FROM equipamentos e
                LEFT JOIN clientes c ON e.cliente_id = c.id
                WHERE e.id = ?
            ");
            $stmt->bind_param("i", $lastId);
            $stmt->execute();
            $result = $stmt->get_result();
            $equipamento = $result->fetch_assoc();
            $equipamento['status'] = (bool)$equipamento['status'];
            
            responderSucesso('Equipamento criado com sucesso', $equipamento, 201);
        } else {
            responderErro('Erro ao criar equipamento: ' . $stmt->error, 500);
        }
        
    } catch (Exception $e) {
        error_log("Erro ao criar equipamento: " . $e->getMessage());
        responderErro('Dados inválidos: ' . $e->getMessage(), 400);
    }
}

/**
 * Atualizar equipamento
 */
function handlePut($conn, $empresa_id) {
    try {
        $input = json_decode(file_get_contents('php://input'), true);


        if (!isset($input['id'])) {
            responderErro('ID do equipamento é obrigatório', 400);
        }
        $id = $input['id'];
        
        // Verificar se o equipamento existe
        $stmt = $conn->prepare("
            SELECT id FROM equipamentos 
            WHERE id = ? AND empresa_id = ? AND removido_em IS NULL
        ");
        if (!$stmt) {
            responderErro("Erro na preparação da consulta: " . $conn->error, 500);
        }
        $stmt->bind_param("ii", $id, $empresa_id);
        $stmt->execute();
        $result = $stmt->get_result();
        
        if ($result->num_rows === 0) {
            responderErro('Equipamento não encontrado', 404);
        }
        
        // Preparar campos para atualização
        $fields = [];
        $params = [];
        $types = '';
        
        $allowed_fields = ['nome', 'marca', 'modelo', 'numero_serie', 'patrimonio', 'cliente_id', 'descricao', 'data_aquisicao', 'valor_aquisicao', 'garantia_ate', 'localizacao', 'status'];
        
        foreach ($input as $key => $value) {
            if (in_array($key, $allowed_fields)) {
                if (in_array($key, ['nome', 'marca', 'modelo', 'numero_serie', 'patrimonio', 'descricao', 'data_aquisicao', 'garantia_ate', 'localizacao'])) {
                    $value = trim($value);
                    $types .= 's';
                }
                if ($key === 'cliente_id') {
                    $value = (int)$value;
                    $types .= 'i';
                }
                if ($key === 'status') {
                    $value = (bool)$value;
                    $types .= 'i'; // Still 'i' because it's stored as tinyint(1) in DB
                }
                if ($key === 'valor_aquisicao') {
                    $value = (float)$value;
                    $types .= 'd';
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
        
        // Atualizar equipamento
        $sql = "UPDATE equipamentos SET " . implode(', ', $fields) . " WHERE id = ? AND empresa_id = ?";
        $stmt = $conn->prepare($sql);
        if (!$stmt) {
            responderErro("Erro na preparação da consulta: " . $conn->error, 500);
        }
        $stmt->bind_param($types, ...$params);
        
        if ($stmt->execute()) {
            // Buscar o registro atualizado para retornar
            $stmt = $conn->prepare("
                SELECT e.*, c.nome AS nome_cliente 
                FROM equipamentos e
                LEFT JOIN clientes c ON e.cliente_id = c.id
                WHERE e.id = ? AND e.empresa_id = ?
            ");
            $stmt->bind_param("ii", $id, $empresa_id);
            $stmt->execute();
            $result = $stmt->get_result();
            $equipamento = $result->fetch_assoc();
            $equipamento['status'] = (bool)$equipamento['status'];
            
            responderSucesso('Equipamento atualizado com sucesso', $equipamento);
        } else {
            responderErro('Erro ao atualizar equipamento: ' . $stmt->error, 500);
        }
        
    } catch (Exception $e) {
        error_log("Erro geral ao atualizar equipamento: " . $e->getMessage());
        responderErro('Dados inválidos: ' . $e->getMessage(), 400);
    }
}

/**
 * Excluir equipamento (soft delete)
 */
function handleDelete($conn, $empresa_id, $id) {
    try {
        if (!$id) {
            responderErro('ID do equipamento é obrigatório', 400);
        }
        
        // Verificar se o equipamento existe e pertence à empresa
        $stmt = $conn->prepare("
            SELECT id FROM equipamentos 
            WHERE id = ? AND empresa_id = ? AND removido_em IS NULL
        ");
        if (!$stmt) {
            responderErro("Erro na preparação da consulta: " . $conn->error, 500);
        }
        $stmt->bind_param("ii", $id, $empresa_id);
        $stmt->execute();
        $result = $stmt->get_result();
        
        if ($result->num_rows === 0) {
            responderErro('Equipamento não encontrado', 404);
        }
        
        // Verificar se o equipamento está sendo usado em atendimentos
        $stmt = $conn->prepare("
            SELECT COUNT(*) as count FROM atendimentos 
            WHERE equipamento_id = ? AND empresa_id = ? AND removido_em IS NULL
        ");
        if ($stmt) {
            $stmt->bind_param("ii", $id, $empresa_id);
            $stmt->execute();
            $result = $stmt->get_result();
            $count = $result->fetch_assoc()['count'];
            
            if ($count > 0) {
                responderErro('Não é possível excluir este equipamento pois ele possui atendimentos cadastrados', 409);
            }
        }
        
        // Realizar soft delete
        $stmt = $conn->prepare("
            UPDATE equipamentos 
            SET removido_em = NOW() 
            WHERE id = ? AND empresa_id = ?
        ");
        if (!$stmt) {
            responderErro("Erro na preparação da consulta de exclusão: " . $conn->error, 500);
        }
        $stmt->bind_param("ii", $id, $empresa_id);
        
        if ($stmt->execute()) {
            responderSucesso('Equipamento excluído com sucesso');
        } else {
            responderErro('Erro ao excluir equipamento: ' . $stmt->error, 500);
        }
        
    } catch (Exception $e) {
        responderErro('Erro ao excluir equipamento: ' . $e->getMessage(), 500);
    }
}

?>