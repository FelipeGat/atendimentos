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
// Em desenvolvimento, usar * para permitir qualquer origem
// Em produção, definir a origem específica do seu frontend
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
    $conn = getConnection(); // <-- CORREÇÃO: Inicializa a conexão PDO
    if (!$conn) {
        throw new Exception("Falha ao obter conexão com o banco de dados.");
    }

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

// Suporte a X-HTTP-Method-Override para requisições POST que deveriam ser PUT/DELETE
if ($_SERVER['REQUEST_METHOD'] === 'POST' && isset($_SERVER['HTTP_X_HTTP_METHOD_OVERRIDE'])) {
    $method = strtoupper($_SERVER['HTTP_X_HTTP_METHOD_OVERRIDE']);
} else {
    $method = $_SERVER['REQUEST_METHOD'];
}

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
        // Usar o handler de exclusão (soft delete) que valida dependências e usa obterEmpresaId()
        handleDelete($conn, $empresa_id);
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
        // Debug: registrar contexto da requisição
        error_log("[SEGMENTOS DEBUG] handleGet called - empresa_id=" . var_export($empresa_id, true) . " id=" . var_export($id, true));
        if ($id) {
            // Buscar segmento específico
            $stmt = $conn->prepare("
                SELECT id, nome, descricao, ativo, criado_em, atualizado_em
                FROM segmentos 
                WHERE id = ? AND empresa_id = ? AND removido_em IS NULL
            ");
            if (!$stmt) {
                responderErro("Erro na preparação da consulta", 500);
            }
            $stmt->execute([$id, $empresa_id]);
            $segmento = $stmt->fetch(PDO::FETCH_ASSOC);
            
            if (!$segmento) {
                responderErro('Segmento não encontrado', 404);
            }
            
            // Converter ativo para boolean
            $segmento['ativo'] = (bool)$segmento['ativo'];
            
            error_log('[SEGMENTOS DEBUG] segmento encontrado: ' . json_encode($segmento));
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
                responderErro("Erro na preparação da consulta", 500);
            }
            $stmt->execute([$empresa_id]);
            $segmentos = $stmt->fetchAll(PDO::FETCH_ASSOC);
            
            // Converter ativo para boolean em todos os registros
            foreach ($segmentos as &$segmento) {
                $segmento['ativo'] = (bool)$segmento['ativo'];
            }

            error_log('[SEGMENTOS DEBUG] segmentos count=' . count($segmentos));
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
        // Detectar se os dados estão vindo como FormData (via $_POST) ou JSON (via php://input)
        if (!empty($_POST)) {
            // Dados vindo como FormData via POST
            $nome = trim($_POST['nome'] ?? '');
            $descricao = trim($_POST['descricao'] ?? '');
            $ativo = isset($_POST['ativo']) ? (int)$_POST['ativo'] : 1;
        } else {
            // Dados vindo como JSON via php://input
            $input = json_decode(file_get_contents('php://input'), true);
            
            if (!$input || !isset($input['nome']) || empty(trim($input['nome']))) {
                responderErro('Nome do segmento é obrigatório', 400);
            }
            
            $nome = trim($input['nome']);
            $descricao = isset($input['descricao']) ? trim($input['descricao']) : '';
            $ativo = isset($input['ativo']) ? (int)$input['ativo'] : 1;
        }
        
        // Validar dados obrigatórios
        if (empty($nome)) {
            responderErro('Nome do segmento é obrigatório', 400);
        }
        
        // Verificar se já existe segmento com mesmo nome na empresa
        $stmt = $conn->prepare("
            SELECT id FROM segmentos 
            WHERE nome = ? AND empresa_id = ? AND removido_em IS NULL
        ");
        if (!$stmt) {
            responderErro("Erro na preparação da consulta", 500);
        }
        $stmt->execute([$nome, $empresa_id]);
        
        if ($stmt->rowCount() > 0) {
            responderErro('Já existe um segmento com este nome', 409);
        }
        
        // Inserir novo segmento
        $stmt = $conn->prepare("
            INSERT INTO segmentos (nome, descricao, ativo, empresa_id) 
            VALUES (?, ?, ?, ?)
        ");
        if (!$stmt) {
            responderErro("Erro na preparação da consulta", 500);
        }
        
        $result = $stmt->execute([$nome, $descricao, $ativo, $empresa_id]);
        
        if ($result) {
            $lastId = $conn->lastInsertId();
            
            // Buscar o registro criado para retornar
            $stmt = $conn->prepare("
                SELECT id, nome, descricao, ativo, criado_em, atualizado_em
                FROM segmentos 
                WHERE id = ?
            ");
            $stmt->execute([$lastId]);
            $segmento = $stmt->fetch(PDO::FETCH_ASSOC);
            $segmento['ativo'] = (bool)$segmento['ativo'];
            
            responderSucesso('Segmento criado com sucesso', $segmento, 201);
        } else {
            responderErro('Erro ao criar segmento', 500);
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
        // Detectar se os dados estão vindo como FormData (via $_POST) ou JSON (via php://input)
        if (!empty($_POST)) {
            // Dados vindo como FormData via POST
            $id = (int)($_POST['id'] ?? 0);
            $nome = trim($_POST['nome'] ?? '');
            $descricao = trim($_POST['descricao'] ?? '');
            $ativo = isset($_POST['ativo']) ? (int)$_POST['ativo'] : 1;
        } else {
            // Dados vindo como JSON via php://input
            $input = json_decode(file_get_contents('php://input'), true);

            // O ID é lido do corpo da requisição
            if (!isset($input['id'])) {
                responderErro('ID do segmento é obrigatório', 400);
            }
            $id = $input['id'];
            
            $nome = trim($input['nome'] ?? '');
            $descricao = trim($input['descricao'] ?? '');
            $ativo = isset($input['ativo']) ? (int)$input['ativo'] : 1;
        }
        
        // Verificar se o segmento existe
        $stmt = $conn->prepare("
            SELECT id FROM segmentos 
            WHERE id = ? AND empresa_id = ? AND removido_em IS NULL
        ");
        if (!$stmt) {
            responderErro("Erro na preparação da consulta", 500);
        }
        $stmt->execute([$id, $empresa_id]);
        
        if ($stmt->rowCount() === 0) {
            responderErro('Segmento não encontrado', 404);
        }
        
        // Verificar nome único (se fornecido)
        if (!empty($nome)) {
            $stmt = $conn->prepare("
                SELECT id FROM segmentos 
                WHERE nome = ? AND empresa_id = ? AND id != ? AND removido_em IS NULL
            ");
            if (!$stmt) {
                responderErro("Erro na preparação da consulta", 500);
            }
            $stmt->execute([$nome, $empresa_id, $id]);
            
            if ($stmt->rowCount() > 0) {
                responderErro('Já existe outro segmento com este nome', 409);
            }
        }
        
        // Preparar campos para atualização
        $fields = [];
        $params = [];
        
        // Campos que podem ser atualizados
        $possible_fields = [
            'nome' => $nome,
            'descricao' => $descricao,
            'ativo' => $ativo
        ];
        
        foreach ($possible_fields as $key => $value) {
            if ($key === 'nome' || $key === 'descricao') {
                $value = trim($value);
            }
            if ($key === 'ativo') {
                $value = (int)$value;
            }
            
            // Adiciona campo à atualização somente se tiver valor
            if ($key === 'nome' && !empty($value)) {
                $fields[] = "{$key} = ?";
                $params[] = $value;
            } elseif ($key !== 'nome') { // descricao e ativo podem ser atualizados mesmo estando vazios ou 0
                $fields[] = "{$key} = ?";
                $params[] = $value;
            }
        }
        
        if (empty($fields)) {
            responderErro('Nenhum campo válido para atualizar', 400);
        }
        
        $params[] = $id;
        $params[] = $empresa_id;
        
        // Atualizar segmento
        $sql = "UPDATE segmentos SET " . implode(', ', $fields) . " WHERE id = ? AND empresa_id = ?";
        $stmt = $conn->prepare($sql);
        if (!$stmt) {
            responderErro("Erro na preparação da consulta", 500);
        }
        
        $result = $stmt->execute($params);
        
        if ($result) {
            // Buscar o registro atualizado para retornar
            $stmt = $conn->prepare("
                SELECT id, nome, descricao, ativo, criado_em, atualizado_em
                FROM segmentos 
                WHERE id = ? AND empresa_id = ?
            ");
            $stmt->execute([$id, $empresa_id]);
            $segmento = $stmt->fetch(PDO::FETCH_ASSOC);
            $segmento['ativo'] = (bool)$segmento['ativo'];
            
            responderSucesso('Segmento atualizado com sucesso', $segmento);
        } else {
            responderErro('Erro ao atualizar segmento', 500);
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
            responderErro("Erro na preparação da consulta", 500);
        }
        $stmt->execute([$id, $empresa_id]);
        
        if ($stmt->rowCount() === 0) {
            responderErro('Segmento não encontrado', 404);
        }
        
        // Verificação de dependência de clientes desativada para evitar erro de coluna inexistente
        // $stmt_check = $conn->prepare("
        //     SELECT COUNT(*) as count FROM clientes 
        //     WHERE segmento_id = ? AND empresa_id = ? AND removido_em IS NULL
        // ");
        // if (!$stmt_check) {
        //     responderErro("Erro na preparação da consulta de dependência", 500);
        // }
        // $stmt_check->execute([$id, $empresa_id]);
        // $result_check = $stmt_check->fetch(PDO::FETCH_ASSOC);
        // $count = (int)$result_check['count'];
        // 
        // if ($count > 0) {
        //     responderErro('Não é possível excluir este segmento pois ele está sendo usado por ' . $count . ' cliente(s).', 409);
        // }
        
        // Realizar soft delete
        $stmt_delete = $conn->prepare("
            UPDATE segmentos 
            SET removido_em = NOW() 
            WHERE id = ? AND empresa_id = ?
        ");
        if (!$stmt_delete) {
            responderErro("Erro na preparação da consulta de exclusão", 500);
        }
        
        $result = $stmt_delete->execute([$id, $empresa_id]);
        
        if ($result) {
            responderSucesso('Segmento excluído com sucesso');
        } else {
            responderErro('Erro ao excluir segmento', 500);
        }
        
    } catch (Exception $e) {
        responderErro('Erro ao excluir segmento: ' . $e->getMessage(), 500);
    }
}