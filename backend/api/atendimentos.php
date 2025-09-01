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
                getAtendimento($pdo, $id);
            } else {
                getAllAtendimentos($pdo);
            }
            break;
            
        case 'POST':
            createAtendimento($pdo);
            break;
            
        case 'PUT':
            if ($id) {
                updateAtendimento($pdo, $id);
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
                deleteAtendimento($pdo, $id);
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

// Função para listar todos os atendimentos com informações relacionadas
function getAllAtendimentos($pdo) {
    try {
        // Verificar se as tabelas existem
        $stmt_check = $pdo->prepare("SHOW TABLES LIKE 'atendimentos'");
        $stmt_check->execute();
        if (!$stmt_check->fetch()) {
            throw new Exception('Tabela "atendimentos" não encontrada no banco de dados');
        }

        $stmt_check = $pdo->prepare("SHOW TABLES LIKE 'clientes'");
        $stmt_check->execute();
        if (!$stmt_check->fetch()) {
            throw new Exception('Tabela "clientes" não encontrada no banco de dados');
        }

        $stmt_check = $pdo->prepare("SHOW TABLES LIKE 'assuntos'");
        $stmt_check->execute();
        if (!$stmt_check->fetch()) {
            throw new Exception('Tabela "assuntos" não encontrada no banco de dados');
        }
        
        // Query para buscar atendimentos com os nomes de cliente, assunto e equipamento
        $sql = "SELECT 
                    a.id, 
                    a.descricao,
                    a.prioridade,
                    a.data_atendimento,
                    a.hora_atendimento,
                    a.atendente_id,
                    a.solicitante,
                    a.telefone_solicitante,
                    a.status,
                    a.criado_em,
                    c.nome AS cliente_nome, 
                    s.nome AS assunto_nome
                FROM atendimentos a
                INNER JOIN clientes c ON a.cliente_id = c.id
                INNER JOIN assuntos s ON a.assunto_id = s.id
                WHERE a.removido_em IS NULL
                ORDER BY a.criado_em DESC";
                
        $stmt = $pdo->prepare($sql);
        $stmt->execute();
        $atendimentos = $stmt->fetchAll(PDO::FETCH_ASSOC);
        
        echo json_encode([
            'success' => true,
            'data' => $atendimentos,
            'total' => count($atendimentos),
            'message' => 'Atendimentos carregados com sucesso'
        ]);
        
    } catch (PDOException $e) {
        http_response_code(500);
        echo json_encode([
            'success' => false,
            'error' => 'Erro ao buscar atendimentos: ' . $e->getMessage(),
            'sql_error' => $e->getCode()
        ]);
    }
}

// Função para buscar um atendimento específico
function getAtendimento($pdo, $id) {
    try {
        $sql = "SELECT 
                    a.id, 
                    a.descricao,
                    a.prioridade,
                    a.data_atendimento,
                    a.hora_atendimento,
                    a.atendente_id,
                    a.solicitante,
                    a.telefone_solicitante,
                    a.cliente_id,
                    a.assunto_id,
                    a.status,
                    a.criado_em
                FROM atendimentos a
                WHERE a.id = ? AND a.removido_em IS NULL";

        $stmt = $pdo->prepare($sql);
        $stmt->execute([$id]);
        $atendimento = $stmt->fetch(PDO::FETCH_ASSOC);
        
        if ($atendimento) {
            echo json_encode([
                'success' => true,
                'data' => $atendimento
            ]);
        } else {
            http_response_code(404);
            echo json_encode([
                'success' => false,
                'error' => 'Atendimento não encontrado'
            ]);
        }
    } catch (PDOException $e) {
        http_response_code(500);
        echo json_encode([
            'success' => false,
            'error' => 'Erro ao buscar atendimento: ' . $e->getMessage()
        ]);
    }
}

// Função para criar um novo atendimento
function createAtendimento($pdo) {
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
        $required_fields = ['descricao', 'prioridade', 'data_atendimento', 'hora_atendimento', 'solicitante', 'cliente_id', 'assunto_id'];
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
        
        // Validação dos IDs de cliente e assunto
        validateForeignKeys($pdo, $input);
        
        // Preparar os dados para a inserção
        $data = [
            'descricao' => trim($input['descricao']),
            'prioridade' => trim($input['prioridade']),
            'data_atendimento' => trim($input['data_atendimento']),
            'hora_atendimento' => trim($input['hora_atendimento']),
            'solicitante' => trim($input['solicitante']),
            'telefone_solicitante' => isset($input['telefone_solicitante']) ? trim($input['telefone_solicitante']) : null,
            'cliente_id' => (int) $input['cliente_id'],
            'assunto_id' => (int) $input['assunto_id'],
            'atendente_id' => isset($input['atendente_id']) ? (int) $input['atendente_id'] : null,
            'status' => 'Aberto' // Status inicial padrão
        ];
        
        $stmt = $pdo->prepare("INSERT INTO atendimentos (descricao, prioridade, data_atendimento, hora_atendimento, solicitante, telefone_solicitante, cliente_id, assunto_id, atendente_id, status, criado_em, atualizado_em) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW(), NOW())");
        $stmt->execute(array_values($data));
        
        $id = $pdo->lastInsertId();
        
        echo json_encode([
            'success' => true,
            'message' => 'Atendimento criado com sucesso',
            'data' => array_merge(['id' => $id], $data)
        ]);
    } catch (PDOException $e) {
        http_response_code(500);
        echo json_encode([
            'success' => false,
            'error' => 'Erro ao criar atendimento: ' . $e->getMessage()
        ]);
    } catch (Exception $e) {
        http_response_code(400);
        echo json_encode([
            'success' => false,
            'error' => $e->getMessage()
        ]);
    }
}

// Função para atualizar um atendimento
function updateAtendimento($pdo, $id) {
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
        $required_fields = ['descricao', 'prioridade', 'data_atendimento', 'hora_atendimento', 'solicitante', 'cliente_id', 'assunto_id', 'status'];
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

        // Verificar se o atendimento existe
        $stmt = $pdo->prepare("SELECT id FROM atendimentos WHERE id = ? AND removido_em IS NULL");
        $stmt->execute([$id]);
        if (!$stmt->fetch()) {
            http_response_code(404);
            echo json_encode([
                'success' => false,
                'error' => 'Atendimento não encontrado'
            ]);
            return;
        }

        // Validação dos IDs de cliente e assunto
        validateForeignKeys($pdo, $input);
        
        // Preparar os dados para a atualização
        $data = [
            'descricao' => trim($input['descricao']),
            'prioridade' => trim($input['prioridade']),
            'data_atendimento' => trim($input['data_atendimento']),
            'hora_atendimento' => trim($input['hora_atendimento']),
            'solicitante' => trim($input['solicitante']),
            'telefone_solicitante' => isset($input['telefone_solicitante']) ? trim($input['telefone_solicitante']) : null,
            'cliente_id' => (int) $input['cliente_id'],
            'assunto_id' => (int) $input['assunto_id'],
            'atendente_id' => isset($input['atendente_id']) ? (int) $input['atendente_id'] : null,
            'status' => trim($input['status'])
        ];
        
        $stmt = $pdo->prepare("UPDATE atendimentos SET descricao = ?, prioridade = ?, data_atendimento = ?, hora_atendimento = ?, solicitante = ?, telefone_solicitante = ?, cliente_id = ?, assunto_id = ?, atendente_id = ?, status = ?, atualizado_em = NOW() WHERE id = ?");
        $stmt->execute(array_merge(array_values($data), [$id]));
        
        echo json_encode([
            'success' => true,
            'message' => 'Atendimento atualizado com sucesso',
            'data' => array_merge(['id' => $id], $data)
        ]);
    } catch (PDOException $e) {
        http_response_code(500);
        echo json_encode([
            'success' => false,
            'error' => 'Erro ao atualizar atendimento: ' . $e->getMessage()
        ]);
    } catch (Exception $e) {
        http_response_code(400);
        echo json_encode([
            'success' => false,
            'error' => $e->getMessage()
        ]);
    }
}

// Função para excluir um atendimento (soft delete)
function deleteAtendimento($pdo, $id) {
    try {
        // Verificar se o atendimento existe
        $stmt = $pdo->prepare("SELECT id FROM atendimentos WHERE id = ? AND removido_em IS NULL");
        $stmt->execute([$id]);
        if (!$stmt->fetch()) {
            http_response_code(404);
            echo json_encode([
                'success' => false,
                'error' => 'Atendimento não encontrado'
            ]);
            return;
        }
        
        // Realizar soft delete
        $stmt = $pdo->prepare("UPDATE atendimentos SET removido_em = NOW() WHERE id = ?");
        $stmt->execute([$id]);
        
        echo json_encode([
            'success' => true,
            'message' => 'Atendimento excluído com sucesso'
        ]);
    } catch (PDOException $e) {
        http_response_code(500);
        echo json_encode([
            'success' => false,
            'error' => 'Erro ao excluir atendimento: ' . $e->getMessage()
        ]);
    }
}

// Função para validar se as chaves estrangeiras existem
function validateForeignKeys($pdo, $input) {
    // Validação de cliente_id
    $stmt_cliente = $pdo->prepare("SELECT id FROM clientes WHERE id = ? AND removido_em IS NULL");
    $stmt_cliente->execute([$input['cliente_id']]);
    if (!$stmt_cliente->fetch()) {
        throw new Exception('ID do cliente não encontrado ou excluído');
    }
    
    // Validação de assunto_id
    $stmt_assunto = $pdo->prepare("SELECT id FROM assuntos WHERE id = ? AND removido_em IS NULL");
    $stmt_assunto->execute([$input['assunto_id']]);
    if (!$stmt_assunto->fetch()) {
        throw new Exception('ID do assunto não encontrado ou excluído');
    }
}
?>