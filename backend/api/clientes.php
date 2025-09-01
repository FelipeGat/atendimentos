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
                getCliente($pdo, $id);
            } else {
                getAllClientes($pdo);
            }
            break;
            
        case 'POST':
            createCliente($pdo);
            break;
            
        case 'PUT':
            if ($id) {
                updateCliente($pdo, $id);
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
                deleteCliente($pdo, $id);
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

// Função para listar todos os clientes
function getAllClientes($pdo) {
    try {
        // Verificar se a tabela existe
        $stmt = $pdo->prepare("SHOW TABLES LIKE 'clientes'");
        $stmt->execute();
        if (!$stmt->fetch()) {
            throw new Exception('Tabela "clientes" não encontrada no banco de dados');
        }
        
        // Buscar clientes
        $stmt = $pdo->prepare("SELECT id, nome, cep, logradouro, numero, bairro, cidade, estado, cpf_cnpj, email, telefone, distancia_base_cliente, pedagio, criado_em, atualizado_em, ativo, observacoes, segmento_id, tipo_de_cliente FROM clientes WHERE removido_em IS NULL ORDER BY nome ASC");
        $stmt->execute();
        $clientes = $stmt->fetchAll(PDO::FETCH_ASSOC);
        
        echo json_encode([
            'success' => true,
            'data' => $clientes,
            'total' => count($clientes),
            'message' => 'Clientes carregados com sucesso'
        ]);
        
    } catch (PDOException $e) {
        http_response_code(500);
        echo json_encode([
            'success' => false,
            'error' => 'Erro ao buscar clientes: ' . $e->getMessage(),
            'sql_error' => $e->getCode()
        ]);
    }
}

// Função para buscar um cliente específico
function getCliente($pdo, $id) {
    try {
        $stmt = $pdo->prepare("SELECT id, nome, cep, logradouro, numero, bairro, cidade, estado, cpf_cnpj, email, telefone, distancia_base_cliente, pedagio, criado_em, atualizado_em, ativo, observacoes, segmento_id, tipo_de_cliente FROM clientes WHERE id = ? AND removido_em IS NULL");
        $stmt->execute([$id]);
        $cliente = $stmt->fetch(PDO::FETCH_ASSOC);
        
        if ($cliente) {
            echo json_encode([
                'success' => true,
                'data' => $cliente
            ]);
        } else {
            http_response_code(404);
            echo json_encode([
                'success' => false,
                'error' => 'Cliente não encontrado'
            ]);
        }
    } catch (PDOException $e) {
        http_response_code(500);
        echo json_encode([
            'success' => false,
            'error' => 'Erro ao buscar cliente: ' . $e->getMessage()
        ]);
    }
}

// Função para criar um novo cliente
function createCliente($pdo) {
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
        $required_fields = ['nome', 'email', 'telefone', 'cpf_cnpj'];
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
        
        // Verificação de unicidade para CPF/CNPJ e Email
        $stmt = $pdo->prepare("SELECT id FROM clientes WHERE (cpf_cnpj = ? OR email = ?) AND removido_em IS NULL");
        $stmt->execute([trim($input['cpf_cnpj']), trim($input['email'])]);
        if ($stmt->fetch()) {
            http_response_code(409);
            echo json_encode([
                'success' => false,
                'error' => 'Já existe um cliente com este CPF/CNPJ ou Email'
            ]);
            return;
        }

        // Preparar os dados para a inserção
        $data = [
            'nome' => trim($input['nome']),
            'cep' => isset($input['cep']) ? trim($input['cep']) : null,
            'logradouro' => isset($input['logradouro']) ? trim($input['logradouro']) : null,
            'numero' => isset($input['numero']) ? trim($input['numero']) : null,
            'bairro' => isset($input['bairro']) ? trim($input['bairro']) : null,
            'cidade' => isset($input['cidade']) ? trim($input['cidade']) : null,
            'estado' => isset($input['estado']) ? trim($input['estado']) : null,
            'cpf_cnpj' => trim($input['cpf_cnpj']),
            'email' => trim($input['email']),
            'telefone' => trim($input['telefone']),
            'distancia_base_cliente' => isset($input['distancia_base_cliente']) && $input['distancia_base_cliente'] !== '' ? floatval($input['distancia_base_cliente']) : null,
            'pedagio' => isset($input['pedagio']) && $input['pedagio'] !== '' ? floatval($input['pedagio']) : null,
            'ativo' => isset($input['ativo']) ? (bool)$input['ativo'] : 1,
            'observacoes' => isset($input['observacoes']) ? trim($input['observacoes']) : null,
            'segmento_id' => isset($input['segmento_id']) && $input['segmento_id'] !== '' ? intval($input['segmento_id']) : null,
            'tipo_de_cliente' => isset($input['tipo_de_cliente']) ? trim($input['tipo_de_cliente']) : null
        ];
        
        $stmt = $pdo->prepare("INSERT INTO clientes (nome, cep, logradouro, numero, bairro, cidade, estado, cpf_cnpj, email, telefone, distancia_base_cliente, pedagio, ativo, observacoes, segmento_id, tipo_de_cliente, criado_em, atualizado_em) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW(), NOW())");
        $stmt->execute(array_values($data));
        
        $id = $pdo->lastInsertId();
        
        echo json_encode([
            'success' => true,
            'message' => 'Cliente criado com sucesso',
            'data' => array_merge(['id' => $id], $data)
        ]);
    } catch (PDOException $e) {
        http_response_code(500);
        echo json_encode([
            'success' => false,
            'error' => 'Erro ao criar cliente: ' . $e->getMessage()
        ]);
    }
}

// Função para atualizar um cliente
function updateCliente($pdo, $id) {
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
        $required_fields = ['nome', 'email', 'telefone', 'cpf_cnpj'];
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
        
        // Verificar se o cliente existe
        $stmt = $pdo->prepare("SELECT id FROM clientes WHERE id = ? AND removido_em IS NULL");
        $stmt->execute([$id]);
        if (!$stmt->fetch()) {
            http_response_code(404);
            echo json_encode([
                'success' => false,
                'error' => 'Cliente não encontrado'
            ]);
            return;
        }
        
        // Verificar se já existe outro cliente com o mesmo CPF/CNPJ ou Email
        $stmt = $pdo->prepare("SELECT id FROM clientes WHERE (cpf_cnpj = ? OR email = ?) AND id != ? AND removido_em IS NULL");
        $stmt->execute([trim($input['cpf_cnpj']), trim($input['email']), $id]);
        if ($stmt->fetch()) {
            http_response_code(409);
            echo json_encode([
                'success' => false,
                'error' => 'Já existe outro cliente com este CPF/CNPJ ou Email'
            ]);
            return;
        }

        // Preparar os dados para a atualização
        $data = [
            'nome' => trim($input['nome']),
            'cep' => isset($input['cep']) ? trim($input['cep']) : null,
            'logradouro' => isset($input['logradouro']) ? trim($input['logradouro']) : null,
            'numero' => isset($input['numero']) ? trim($input['numero']) : null,
            'bairro' => isset($input['bairro']) ? trim($input['bairro']) : null,
            'cidade' => isset($input['cidade']) ? trim($input['cidade']) : null,
            'estado' => isset($input['estado']) ? trim($input['estado']) : null,
            'cpf_cnpj' => trim($input['cpf_cnpj']),
            'email' => trim($input['email']),
            'telefone' => trim($input['telefone']),
            'distancia_base_cliente' => isset($input['distancia_base_cliente']) && $input['distancia_base_cliente'] !== '' ? floatval($input['distancia_base_cliente']) : null,
            'pedagio' => isset($input['pedagio']) && $input['pedagio'] !== '' ? floatval($input['pedagio']) : null,
            'ativo' => isset($input['ativo']) ? (bool)$input['ativo'] : 1,
            'observacoes' => isset($input['observacoes']) ? trim($input['observacoes']) : null,
            'segmento_id' => isset($input['segmento_id']) && $input['segmento_id'] !== '' ? intval($input['segmento_id']) : null,
            'tipo_de_cliente' => isset($input['tipo_de_cliente']) ? trim($input['tipo_de_cliente']) : null
        ];
        
        $stmt = $pdo->prepare("UPDATE clientes SET nome = ?, cep = ?, logradouro = ?, numero = ?, bairro = ?, cidade = ?, estado = ?, cpf_cnpj = ?, email = ?, telefone = ?, distancia_base_cliente = ?, pedagio = ?, ativo = ?, observacoes = ?, segmento_id = ?, tipo_de_cliente = ?, atualizado_em = NOW() WHERE id = ?");
        $stmt->execute(array_merge(array_values($data), [$id]));
        
        echo json_encode([
            'success' => true,
            'message' => 'Cliente atualizado com sucesso',
            'data' => array_merge(['id' => $id], $data)
        ]);
    } catch (PDOException $e) {
        http_response_code(500);
        echo json_encode([
            'success' => false,
            'error' => 'Erro ao atualizar cliente: ' . $e->getMessage()
        ]);
    }
}

// Função para excluir um cliente (soft delete)
function deleteCliente($pdo, $id) {
    try {
        // Verificar se o cliente existe
        $stmt = $pdo->prepare("SELECT id FROM clientes WHERE id = ? AND removido_em IS NULL");
        $stmt->execute([$id]);
        if (!$stmt->fetch()) {
            http_response_code(404);
            echo json_encode([
                'success' => false,
                'error' => 'Cliente não encontrado'
            ]);
            return;
        }
        
        // Verificar se o cliente está sendo usado em algum atendimento
        $stmt = $pdo->prepare("SELECT COUNT(*) as count FROM atendimentos WHERE cliente_id = ? AND removido_em IS NULL");
        $stmt->execute([$id]);
        $result = $stmt->fetch(PDO::FETCH_ASSOC);
        
        if ($result['count'] > 0) {
            http_response_code(409);
            echo json_encode([
                'success' => false,
                'error' => 'Não é possível excluir este cliente pois ele está sendo usado em atendimentos'
            ]);
            return;
        }
        
        // Realizar soft delete
        $stmt = $pdo->prepare("UPDATE clientes SET removido_em = NOW() WHERE id = ?");
        $stmt->execute([$id]);
        
        echo json_encode([
            'success' => true,
            'message' => 'Cliente excluído com sucesso'
        ]);
    } catch (PDOException $e) {
        http_response_code(500);
        echo json_encode([
            'success' => false,
            'error' => 'Erro ao excluir cliente: ' . $e->getMessage()
        ]);
    }
}
?>

