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
$id = null;

// Primeiro, verificar se há ID na query string
if (isset($_GET['id']) && is_numeric($_GET['id'])) {
    $id = (int) $_GET['id'];
} else {
    // Se não há na query string, procurar na URL
    $path_parts = explode('/', trim($path, '/'));
    foreach ($path_parts as $part) {
        if (is_numeric($part)) {
            $id = (int) $part;
            break;
        }
    }
}

try {
    switch ($method) {
        case 'GET':
            if ($id) {
                getSegmento($pdo, $id);
            } else {
                getAllSegmentos($pdo);
            }
            break;
            
        case 'POST':
            createSegmento($pdo);
            break;
            
        case 'PUT':
            if ($id) {
                updateSegmento($pdo, $id);
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
                deleteSegmento($pdo, $id);
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

// Função para listar todos os segmentos
function getAllSegmentos($pdo) {
    try {
        // Verificar se a tabela existe
        $stmt = $pdo->prepare("SHOW TABLES LIKE 'segmentos'");
        $stmt->execute();
        if (!$stmt->fetch()) {
            throw new Exception('Tabela "segmentos" não encontrada no banco de dados');
        }
        
        // Buscar segmentos
        $stmt = $pdo->prepare("SELECT id, nome, criado_em FROM segmentos WHERE removido_em IS NULL ORDER BY nome ASC");
        $stmt->execute();
        $segmentos = $stmt->fetchAll(PDO::FETCH_ASSOC);
        
        echo json_encode([
            'success' => true,
            'data' => $segmentos,
            'total' => count($segmentos),
            'message' => 'Segmentos carregados com sucesso'
        ]);
        
    } catch (PDOException $e) {
        http_response_code(500);
        echo json_encode([
            'success' => false,
            'error' => 'Erro ao buscar segmentos: ' . $e->getMessage(),
            'sql_error' => $e->getCode()
        ]);
    }
}

// Função para buscar um segmento específico
function getSegmento($pdo, $id) {
    try {
        $stmt = $pdo->prepare("SELECT id, nome, criado_em FROM segmentos WHERE id = ? AND removido_em IS NULL");
        $stmt->execute([$id]);
        $segmento = $stmt->fetch(PDO::FETCH_ASSOC);
        
        if ($segmento) {
            echo json_encode([
                'success' => true,
                'data' => $segmento
            ]);
        } else {
            http_response_code(404);
            echo json_encode([
                'success' => false,
                'error' => 'Segmento não encontrado'
            ]);
        }
    } catch (PDOException $e) {
        http_response_code(500);
        echo json_encode([
            'success' => false,
            'error' => 'Erro ao buscar segmento: ' . $e->getMessage()
        ]);
    }
}

// Função para criar um novo segmento
function createSegmento($pdo) {
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

        // Validação de campos obrigatórios
        $required_fields = ['nome'];
        foreach ($required_fields as $field) {
            if (!isset($input[$field]) || empty(trim($input[$field]))) {
                http_response_code(400);
                echo json_encode([
                    'success' => false,
                    'error' => "O campo '{$field}' é obrigatório"
                ]);
                return;
            }
        }
        
        // Verificação de unicidade para o nome
        $stmt = $pdo->prepare("SELECT id FROM segmentos WHERE nome = ? AND removido_em IS NULL");
        $stmt->execute([trim($input['nome'])]);
        if ($stmt->fetch()) {
            http_response_code(409);
            echo json_encode([
                'success' => false,
                'error' => 'Já existe um segmento com este nome'
            ]);
            return;
        }

        // Preparar os dados para a inserção
        $data = [
            'nome' => trim($input['nome'])
        ];
        
        $stmt = $pdo->prepare("INSERT INTO segmentos (nome, criado_em, atualizado_em) VALUES (?, NOW(), NOW())");
        $stmt->execute(array_values($data));
        
        $id = $pdo->lastInsertId();
        
        echo json_encode([
            'success' => true,
            'message' => 'Segmento criado com sucesso',
            'data' => array_merge(['id' => $id], $data)
        ]);
    } catch (PDOException $e) {
        http_response_code(500);
        echo json_encode([
            'success' => false,
            'error' => 'Erro ao criar segmento: ' . $e->getMessage()
        ]);
    }
}

// Função para atualizar um segmento
function updateSegmento($pdo, $id) {
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

        // Validação de campos obrigatórios
        $required_fields = ['nome'];
        foreach ($required_fields as $field) {
            if (!isset($input[$field]) || empty(trim($input[$field]))) {
                http_response_code(400);
                echo json_encode([
                    'success' => false,
                    'error' => "O campo '{$field}' é obrigatório"
                ]);
                return;
            }
        }
        
        // Validação de campos obrigatórios
        $required_fields = ['nome'];
        foreach ($required_fields as $field) {
            if (!isset($input[$field]) || empty(trim($input[$field]))) {
                http_response_code(400);
                echo json_encode([
                    'success' => false,
                    'error' => "O campo '{$field}' é obrigatório"
                ]);
                return;
            }
        }
        
        // Verificar se o segmento existe
        $stmt = $pdo->prepare("SELECT id FROM segmentos WHERE id = ? AND removido_em IS NULL");
        $stmt->execute([$id]);
        if (!$stmt->fetch()) {
            http_response_code(404);
            echo json_encode([
                'success' => false,
                'error' => 'Segmento não encontrado'
            ]);
            return;
        }
        
        // Verificação de unicidade para o nome (se fornecido e diferente do atual)
        if (isset($input['nome']) && !empty(trim($input['nome']))) {
            $stmt = $pdo->prepare("SELECT id FROM segmentos WHERE nome = ? AND id != ? AND removido_em IS NULL");
            $stmt->execute([trim($input['nome']), $id]);
            if ($stmt->fetch()) {
                http_response_code(409);
                echo json_encode([
                    'success' => false,
                    'error' => 'Já existe outro segmento com este nome'
                ]);
                return;
            }
        }

        // Preparar os dados para a atualização
        $data = [
            'nome' => trim($input['nome'])
        ];
        
        $stmt = $pdo->prepare("UPDATE segmentos SET nome = ?, atualizado_em = NOW() WHERE id = ?");
        $stmt->execute(array_merge(array_values($data), [$id]));
        
        echo json_encode([
            'success' => true,
            'message' => 'Segmento atualizado com sucesso',
            'data' => array_merge(['id' => $id], $data)
        ]);
    } catch (PDOException $e) {
        http_response_code(500);
        echo json_encode([
            'success' => false,
            'error' => 'Erro ao atualizar segmento: ' . $e->getMessage()
        ]);
    }
}

// Função para excluir um segmento (soft delete)
function deleteSegmento($pdo, $id) {
    try {
        // Verificar se o segmento existe
        $stmt = $pdo->prepare("SELECT id FROM segmentos WHERE id = ? AND removido_em IS NULL");
        $stmt->execute([$id]);
        if (!$stmt->fetch()) {
            http_response_code(404);
            echo json_encode([
                'success' => false,
                'error' => 'Segmento não encontrado'
            ]);
            return;
        }
        
        // Verificar se o segmento está sendo usado em algum cliente
        $stmt = $pdo->prepare("SELECT COUNT(*) as count FROM clientes WHERE segmento_id = ? AND removido_em IS NULL");
        $stmt->execute([$id]);
        $result = $stmt->fetch(PDO::FETCH_ASSOC);
        
        if ($result['count'] > 0) {
            http_response_code(409);
            echo json_encode([
                'success' => false,
                'error' => 'Não é possível excluir este segmento pois ele está sendo usado em um ou mais clientes'
            ]);
            return;
        }
        
        // Realizar soft delete
        $stmt = $pdo->prepare("UPDATE segmentos SET removido_em = NOW() WHERE id = ?");
        $stmt->execute([$id]);
        
        echo json_encode([
            'success' => true,
            'message' => 'Segmento excluído com sucesso'
        ]);
    } catch (PDOException $e) {
        http_response_code(500);
        echo json_encode([
            'success' => false,
            'error' => 'Erro ao excluir segmento: ' . $e->getMessage()
        ]);
    }
}
?>