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

// Extract ID if present in URL or query string
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
                getEquipamento($pdo, $id);
            } else {
                getAllEquipamentos($pdo);
            }
            break;
            
        case 'POST':
            createEquipamento($pdo);
            break;
            
        case 'PUT':
            if ($id) {
                updateEquipamento($pdo, $id);
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
                deleteEquipamento($pdo, $id);
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

// Função para listar todos os equipamentos
function getAllEquipamentos($pdo) {
    try {
        // Verificar se a tabela existe
        $stmt = $pdo->prepare("SHOW TABLES LIKE 'equipamentos'");
        $stmt->execute();
        if (!$stmt->fetch()) {
            throw new Exception('Tabela "equipamentos" não encontrada no banco de dados');
        }
        
        // Buscar equipamentos
        $stmt = $pdo->prepare("SELECT id, nome, marca, descricao, numero_de_serie, patrimonio, criado_em, atualizado_em FROM equipamentos WHERE removido_em IS NULL ORDER BY nome ASC");
        $stmt->execute();
        $equipamentos = $stmt->fetchAll(PDO::FETCH_ASSOC);
        
        echo json_encode([
            'success' => true,
            'data' => $equipamentos,
            'total' => count($equipamentos),
            'message' => 'Equipamentos carregados com sucesso'
        ]);
        
    } catch (PDOException $e) {
        http_response_code(500);
        echo json_encode([
            'success' => false,
            'error' => 'Erro ao buscar equipamentos: ' . $e->getMessage(),
            'sql_error' => $e->getCode()
        ]);
    }
}

// Função para buscar um equipamento específico
function getEquipamento($pdo, $id) {
    try {
        $stmt = $pdo->prepare("SELECT id, nome, marca, descricao, numero_de_serie, patrimonio, criado_em, atualizado_em FROM equipamentos WHERE id = ? AND removido_em IS NULL");
        $stmt->execute([$id]);
        $equipamento = $stmt->fetch(PDO::FETCH_ASSOC);
        
        if ($equipamento) {
            echo json_encode([
                'success' => true,
                'data' => $equipamento
            ]);
        } else {
            http_response_code(404);
            echo json_encode([
                'success' => false,
                'error' => 'Equipamento não encontrado'
            ]);
        }
    } catch (PDOException $e) {
        http_response_code(500);
        echo json_encode([
            'success' => false,
            'error' => 'Erro ao buscar equipamento: ' . $e->getMessage()
        ]);
    }
}

// Função para criar um novo equipamento
function createEquipamento($pdo) {
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
        $required_fields = ['nome', 'marca'];
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
        
        // Verificação de unicidade para número de série (se fornecido)
        if (isset($input['numero_de_serie']) && !empty(trim($input['numero_de_serie']))) {
            $stmt = $pdo->prepare("SELECT id FROM equipamentos WHERE numero_de_serie = ? AND removido_em IS NULL");
            $stmt->execute([trim($input['numero_de_serie'])]);
            if ($stmt->fetch()) {
                http_response_code(409);
                echo json_encode([
                    'success' => false,
                    'error' => 'Já existe um equipamento com este número de série'
                ]);
                return;
            }
        }

        // Verificação de unicidade para patrimônio (se fornecido)
        if (isset($input['patrimonio']) && !empty(trim($input['patrimonio']))) {
            $stmt = $pdo->prepare("SELECT id FROM equipamentos WHERE patrimonio = ? AND removido_em IS NULL");
            $stmt->execute([trim($input['patrimonio'])]);
            if ($stmt->fetch()) {
                http_response_code(409);
                echo json_encode([
                    'success' => false,
                    'error' => 'Já existe um equipamento com este número de patrimônio'
                ]);
                return;
            }
        }
        
        // Preparar os dados para a inserção
        $data = [
            'nome' => trim($input['nome']),
            'marca' => trim($input['marca']),
            'descricao' => isset($input['descricao']) ? trim($input['descricao']) : null,
            'numero_de_serie' => isset($input['numero_de_serie']) && !empty(trim($input['numero_de_serie'])) ? trim($input['numero_de_serie']) : null,
            'patrimonio' => isset($input['patrimonio']) && !empty(trim($input['patrimonio'])) ? trim($input['patrimonio']) : null
        ];
        
        $stmt = $pdo->prepare("INSERT INTO equipamentos (nome, marca, descricao, numero_de_serie, patrimonio, criado_em, atualizado_em) VALUES (?, ?, ?, ?, ?, NOW(), NOW())");
        $stmt->execute(array_values($data));
        
        $id = $pdo->lastInsertId();
        
        echo json_encode([
            'success' => true,
            'message' => 'Equipamento criado com sucesso',
            'data' => array_merge(['id' => $id], $data)
        ]);
    } catch (PDOException $e) {
        http_response_code(500);
        echo json_encode([
            'success' => false,
            'error' => 'Erro ao criar equipamento: ' . $e->getMessage()
        ]);
    }
}

// Função para atualizar um equipamento
function updateEquipamento($pdo, $id) {
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
        $required_fields = ['nome', 'marca'];
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
        
        // Verificar se o equipamento existe
        $stmt = $pdo->prepare("SELECT id FROM equipamentos WHERE id = ? AND removido_em IS NULL");
        $stmt->execute([$id]);
        if (!$stmt->fetch()) {
            http_response_code(404);
            echo json_encode([
                'success' => false,
                'error' => 'Equipamento não encontrado'
            ]);
            return;
        }
        
        // Verificação de unicidade para número de série (se fornecido e diferente do atual)
        if (isset($input['numero_de_serie']) && !empty(trim($input['numero_de_serie']))) {
            $stmt = $pdo->prepare("SELECT id FROM equipamentos WHERE numero_de_serie = ? AND id != ? AND removido_em IS NULL");
            $stmt->execute([trim($input['numero_de_serie']), $id]);
            if ($stmt->fetch()) {
                http_response_code(409);
                echo json_encode([
                    'success' => false,
                    'error' => 'Já existe outro equipamento com este número de série'
                ]);
                return;
            }
        }

        // Verificação de unicidade para patrimônio (se fornecido e diferente do atual)
        if (isset($input['patrimonio']) && !empty(trim($input['patrimonio']))) {
            $stmt = $pdo->prepare("SELECT id FROM equipamentos WHERE patrimonio = ? AND id != ? AND removido_em IS NULL");
            $stmt->execute([trim($input['patrimonio']), $id]);
            if ($stmt->fetch()) {
                http_response_code(409);
                echo json_encode([
                    'success' => false,
                    'error' => 'Já existe outro equipamento com este número de patrimônio'
                ]);
                return;
            }
        }
        
        // Preparar os dados para a atualização
        $data = [
            'nome' => trim($input['nome']),
            'marca' => trim($input['marca']),
            'descricao' => isset($input['descricao']) ? trim($input['descricao']) : null,
            'numero_de_serie' => isset($input['numero_de_serie']) && !empty(trim($input['numero_de_serie'])) ? trim($input['numero_de_serie']) : null,
            'patrimonio' => isset($input['patrimonio']) && !empty(trim($input['patrimonio'])) ? trim($input['patrimonio']) : null
        ];
        
        $stmt = $pdo->prepare("UPDATE equipamentos SET nome = ?, marca = ?, descricao = ?, numero_de_serie = ?, patrimonio = ?, atualizado_em = NOW() WHERE id = ?");
        $stmt->execute(array_merge(array_values($data), [$id]));
        
        echo json_encode([
            'success' => true,
            'message' => 'Equipamento atualizado com sucesso',
            'data' => array_merge(['id' => $id], $data)
        ]);
    } catch (PDOException $e) {
        http_response_code(500);
        echo json_encode([
            'success' => false,
            'error' => 'Erro ao atualizar equipamento: ' . $e->getMessage()
        ]);
    }
}

// Função para excluir um equipamento (soft delete)
function deleteEquipamento($pdo, $id) {
    try {
        // Verificar se o equipamento existe
        $stmt = $pdo->prepare("SELECT id FROM equipamentos WHERE id = ? AND removido_em IS NULL");
        $stmt->execute([$id]);
        if (!$stmt->fetch()) {
            http_response_code(404);
            echo json_encode([
                'success' => false,
                'error' => 'Equipamento não encontrado'
            ]);
            return;
        }
        
        // Verificar se o equipamento está sendo usado em algum cliente
        $stmt = $pdo->prepare("SELECT COUNT(*) as count FROM clientes_equipamentos WHERE equipamento_id = ? AND removido_em IS NULL");
        $stmt->execute([$id]);
        $result = $stmt->fetch(PDO::FETCH_ASSOC);
        
        if ($result['count'] > 0) {
            http_response_code(409);
            echo json_encode([
                'success' => false,
                'error' => 'Não é possível excluir este equipamento pois ele está sendo usado em um ou mais clientes'
            ]);
            return;
        }
        
        // Realizar soft delete
        $stmt = $pdo->prepare("UPDATE equipamentos SET removido_em = NOW() WHERE id = ?");
        $stmt->execute([$id]);
        
        echo json_encode([
            'success' => true,
            'message' => 'Equipamento excluído com sucesso'
        ]);
    } catch (PDOException $e) {
        http_response_code(500);
        echo json_encode([
            'success' => false,
            'error' => 'Erro ao excluir equipamento: ' . $e->getMessage()
        ]);
    }
}
?>

