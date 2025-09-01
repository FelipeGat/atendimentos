<?php
// Configuração de headers CORS mais robusta
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, POST, PUT, DELETE, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, Authorization, X-Requested-With');
header('Content-Type: application/json; charset=utf-8');

// Preflight request (OPTIONS)
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    echo json_encode(['success' => true, 'message' => 'CORS preflight OK']);
    exit();
}

// Configuração de erro para debug
error_reporting(E_ALL);
ini_set('display_errors', 1);

try {
    // Incluir arquivo de configuração do banco
    $config_path = '../config/db.php';
    if (!file_exists($config_path)) {
        throw new Exception('Arquivo de configuração do banco não encontrado: ' . $config_path);
    }
    
    require_once $config_path;
    
    // Verificar se a conexão PDO foi estabelecida
    if (!isset($pdo)) {
        throw new Exception('Conexão com banco de dados não estabelecida');
    }
    
} catch (Exception $e) {
    http_response_code(500);
    echo json_encode([
        'success' => false,
        'error' => 'Erro de configuração: ' . $e->getMessage(),
        'debug' => [
            'config_path' => $config_path ?? 'não definido',
            'file_exists' => file_exists($config_path ?? '') ? 'sim' : 'não'
        ]
    ]);
    exit();
}

// Get the request method and path
$method = $_SERVER['REQUEST_METHOD'];
$request_uri = $_SERVER['REQUEST_URI'];
$path = parse_url($request_uri, PHP_URL_PATH);

// Debug info
$debug_info = [
    'method' => $method,
    'request_uri' => $request_uri,
    'path' => $path,
    'timestamp' => date('Y-m-d H:i:s')
];

// Extract ID if present in URL
$path_parts = explode('/', trim($path, '/'));
$id = null;

// Procurar por ID numérico na URL
foreach ($path_parts as $part) {
    if (is_numeric($part)) {
        $id = (int) $part;
        break;
    }
}

try {
    switch ($method) {
        case 'GET':
            if ($id) {
                getAssunto($pdo, $id);
            } else {
                getAllAssuntos($pdo);
            }
            break;
            
        case 'POST':
            createAssunto($pdo);
            break;
            
        case 'PUT':
            if ($id) {
                updateAssunto($pdo, $id);
            } else {
                http_response_code(400);
                echo json_encode([
                    'success' => false,
                    'error' => 'ID é obrigatório para atualização',
                    'debug' => $debug_info
                ]);
            }
            break;
            
        case 'DELETE':
            if ($id) {
                deleteAssunto($pdo, $id);
            } else {
                http_response_code(400);
                echo json_encode([
                    'success' => false,
                    'error' => 'ID é obrigatório para exclusão',
                    'debug' => $debug_info
                ]);
            }
            break;
            
        default:
            http_response_code(405);
            echo json_encode([
                'success' => false,
                'error' => 'Método não permitido: ' . $method,
                'debug' => $debug_info
            ]);
            break;
    }
} catch (Exception $e) {
    http_response_code(500);
    echo json_encode([
        'success' => false,
        'error' => 'Erro interno do servidor: ' . $e->getMessage(),
        'debug' => $debug_info
    ]);
}

// Função para listar todos os assuntos
function getAllAssuntos($pdo) {
    try {
        // Verificar se a tabela existe
        $stmt = $pdo->prepare("SHOW TABLES LIKE 'assuntos'");
        $stmt->execute();
        if (!$stmt->fetch()) {
            throw new Exception('Tabela "assuntos" não encontrada no banco de dados');
        }
        
        // Buscar assuntos
        $stmt = $pdo->prepare("SELECT id, nome, criado_em, atualizado_em FROM assuntos WHERE removido_em IS NULL ORDER BY nome ASC");
        $stmt->execute();
        $assuntos = $stmt->fetchAll(PDO::FETCH_ASSOC);
        
        echo json_encode([
            'success' => true,
            'data' => $assuntos,
            'total' => count($assuntos),
            'message' => 'Assuntos carregados com sucesso'
        ]);
        
    } catch (PDOException $e) {
        http_response_code(500);
        echo json_encode([
            'success' => false,
            'error' => 'Erro ao buscar assuntos: ' . $e->getMessage(),
            'sql_error' => $e->getCode()
        ]);
    }
}

// Função para buscar um assunto específico
function getAssunto($pdo, $id) {
    try {
        $stmt = $pdo->prepare("SELECT id, nome, criado_em, atualizado_em FROM assuntos WHERE id = ? AND removido_em IS NULL");
        $stmt->execute([$id]);
        $assunto = $stmt->fetch(PDO::FETCH_ASSOC);
        
        if ($assunto) {
            echo json_encode([
                'success' => true,
                'data' => $assunto
            ]);
        } else {
            http_response_code(404);
            echo json_encode([
                'success' => false,
                'error' => 'Assunto não encontrado'
            ]);
        }
    } catch (PDOException $e) {
        http_response_code(500);
        echo json_encode([
            'success' => false,
            'error' => 'Erro ao buscar assunto: ' . $e->getMessage()
        ]);
    }
}

// Função para criar um novo assunto
function createAssunto($pdo) {
    try {
        $input = json_decode(file_get_contents('php://input'), true);
        
        if (!$input) {
            http_response_code(400);
            echo json_encode([
                'success' => false,
                'error' => 'Dados JSON inválidos'
            ]);
            return;
        }
        
        if (!isset($input['nome']) || empty(trim($input['nome']))) {
            http_response_code(400);
            echo json_encode([
                'success' => false,
                'error' => 'Nome é obrigatório'
            ]);
            return;
        }
        
        $nome = trim($input['nome']);
        
        // Verificar se já existe um assunto com o mesmo nome
        $stmt = $pdo->prepare("SELECT id FROM assuntos WHERE nome = ? AND removido_em IS NULL");
        $stmt->execute([$nome]);
        if ($stmt->fetch()) {
            http_response_code(409);
            echo json_encode([
                'success' => false,
                'error' => 'Já existe um assunto com este nome'
            ]);
            return;
        }
        
        $stmt = $pdo->prepare("INSERT INTO assuntos (nome, criado_em, atualizado_em) VALUES (?, NOW(), NOW())");
        $stmt->execute([$nome]);
        
        $id = $pdo->lastInsertId();
        
        echo json_encode([
            'success' => true,
            'message' => 'Assunto criado com sucesso',
            'data' => [
                'id' => $id,
                'nome' => $nome
            ]
        ]);
    } catch (PDOException $e) {
        http_response_code(500);
        echo json_encode([
            'success' => false,
            'error' => 'Erro ao criar assunto: ' . $e->getMessage()
        ]);
    }
}

// Função para atualizar um assunto
function updateAssunto($pdo, $id) {
    try {
        $input = json_decode(file_get_contents('php://input'), true);
        
        if (!$input) {
            http_response_code(400);
            echo json_encode([
                'success' => false,
                'error' => 'Dados JSON inválidos'
            ]);
            return;
        }
        
        if (!isset($input['nome']) || empty(trim($input['nome']))) {
            http_response_code(400);
            echo json_encode([
                'success' => false,
                'error' => 'Nome é obrigatório'
            ]);
            return;
        }
        
        $nome = trim($input['nome']);
        
        // Verificar se o assunto existe
        $stmt = $pdo->prepare("SELECT id FROM assuntos WHERE id = ? AND removido_em IS NULL");
        $stmt->execute([$id]);
        if (!$stmt->fetch()) {
            http_response_code(404);
            echo json_encode([
                'success' => false,
                'error' => 'Assunto não encontrado'
            ]);
            return;
        }
        
        // Verificar se já existe outro assunto com o mesmo nome
        $stmt = $pdo->prepare("SELECT id FROM assuntos WHERE nome = ? AND id != ? AND removido_em IS NULL");
        $stmt->execute([$nome, $id]);
        if ($stmt->fetch()) {
            http_response_code(409);
            echo json_encode([
                'success' => false,
                'error' => 'Já existe um assunto com este nome'
            ]);
            return;
        }
        
        $stmt = $pdo->prepare("UPDATE assuntos SET nome = ?, atualizado_em = NOW() WHERE id = ?");
        $stmt->execute([$nome, $id]);
        
        echo json_encode([
            'success' => true,
            'message' => 'Assunto atualizado com sucesso',
            'data' => [
                'id' => $id,
                'nome' => $nome
            ]
        ]);
    } catch (PDOException $e) {
        http_response_code(500);
        echo json_encode([
            'success' => false,
            'error' => 'Erro ao atualizar assunto: ' . $e->getMessage()
        ]);
    }
}

// Função para excluir um assunto (soft delete)
function deleteAssunto($pdo, $id) {
    try {
        // Verificar se o assunto existe
        $stmt = $pdo->prepare("SELECT id FROM assuntos WHERE id = ? AND removido_em IS NULL");
        $stmt->execute([$id]);
        if (!$stmt->fetch()) {
            http_response_code(404);
            echo json_encode([
                'success' => false,
                'error' => 'Assunto não encontrado'
            ]);
            return;
        }
        
        // Verificar se o assunto está sendo usado em algum atendimento
        $stmt = $pdo->prepare("SELECT COUNT(*) as count FROM atendimentos WHERE assunto_id = ? AND removido_em IS NULL");
        $stmt->execute([$id]);
        $result = $stmt->fetch(PDO::FETCH_ASSOC);
        
        if ($result['count'] > 0) {
            http_response_code(409);
            echo json_encode([
                'success' => false,
                'error' => 'Não é possível excluir este assunto pois ele está sendo usado em atendimentos'
            ]);
            return;
        }
        
        // Realizar soft delete
        $stmt = $pdo->prepare("UPDATE assuntos SET removido_em = NOW() WHERE id = ?");
        $stmt->execute([$id]);
        
        echo json_encode([
            'success' => true,
            'message' => 'Assunto excluído com sucesso'
        ]);
    } catch (PDOException $e) {
        http_response_code(500);
        echo json_encode([
            'success' => false,
            'error' => 'Erro ao excluir assunto: ' . $e->getMessage()
        ]);
    }
}
?>

