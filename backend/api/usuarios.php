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
                getUsuario($pdo, $id);
            } else {
                getAllUsuarios($pdo);
            }
            break;
            
        case 'POST':
            createUsuario($pdo);
            break;
            
        case 'PUT':
            if ($id) {
                updateUsuario($pdo, $id);
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
                deleteUsuario($pdo, $id);
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

// Função para listar todos os usuários
function getAllUsuarios($pdo) {
    try {
        // Verificar se a tabela existe
        $stmt = $pdo->prepare("SHOW TABLES LIKE 'usuarios'");
        $stmt->execute();
        if (!$stmt->fetch()) {
            throw new Exception('Tabela "usuarios" não encontrada no banco de dados');
        }
        
        // Buscar usuários (não retorna a senha por segurança)
        $stmt = $pdo->prepare("SELECT id, nome, email, cpf, telefone, bloqueado, perfil, criado_em, atualizado_em, foto FROM usuarios WHERE removido_em IS NULL ORDER BY nome ASC");
        $stmt->execute();
        $usuarios = $stmt->fetchAll(PDO::FETCH_ASSOC);
        
        echo json_encode([
            'success' => true,
            'data' => $usuarios,
            'total' => count($usuarios),
            'message' => 'Usuários carregados com sucesso'
        ]);
        
    } catch (PDOException $e) {
        http_response_code(500);
        echo json_encode([
            'success' => false,
            'error' => 'Erro ao buscar usuários: ' . $e->getMessage(),
            'sql_error' => $e->getCode()
        ]);
    }
}

// Função para buscar um usuário específico
function getUsuario($pdo, $id) {
    try {
        $stmt = $pdo->prepare("SELECT id, nome, email, cpf, telefone, bloqueado, perfil, criado_em, atualizado_em, foto FROM usuarios WHERE id = ? AND removido_em IS NULL");
        $stmt->execute([$id]);
        $usuario = $stmt->fetch(PDO::FETCH_ASSOC);
        
        if ($usuario) {
            echo json_encode([
                'success' => true,
                'data' => $usuario
            ]);
        } else {
            http_response_code(404);
            echo json_encode([
                'success' => false,
                'error' => 'Usuário não encontrado'
            ]);
        }
    } catch (PDOException $e) {
        http_response_code(500);
        echo json_encode([
            'success' => false,
            'error' => 'Erro ao buscar usuário: ' . $e->getMessage()
        ]);
    }
}

// Função para criar um novo usuário
function createUsuario($pdo) {
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
        $required_fields = ['nome', 'email', 'cpf', 'senha', 'perfil'];
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
        
        // Validação do perfil
        $perfis_validos = ['atendente', 'gerente', 'admin'];
        if (!in_array(trim($input['perfil']), $perfis_validos)) {
            http_response_code(400);
            echo json_encode([
                'success' => false,
                'error' => 'Perfil inválido. Valores aceitos: ' . implode(', ', $perfis_validos)
            ]);
            return;
        }
        
        // Verificação de unicidade para CPF e Email
        $stmt = $pdo->prepare("SELECT id FROM usuarios WHERE (cpf = ? OR email = ?) AND removido_em IS NULL");
        $stmt->execute([trim($input['cpf']), trim($input['email'])]);
        if ($stmt->fetch()) {
            http_response_code(409);
            echo json_encode([
                'success' => false,
                'error' => 'Já existe um usuário com este CPF ou Email'
            ]);
            return;
        }

        // Validação da senha (mínimo 6 caracteres)
        if (strlen(trim($input['senha'])) < 6) {
            http_response_code(400);
            echo json_encode([
                'success' => false,
                'error' => 'A senha deve ter pelo menos 6 caracteres'
            ]);
            return;
        }

        // Hash da senha
        $hashed_password = password_hash(trim($input['senha']), PASSWORD_DEFAULT);

        // Preparar os dados para a inserção
        $data = [
            'nome' => trim($input['nome']),
            'cpf' => trim($input['cpf']),
            'email' => trim($input['email']),
            'senha' => $hashed_password,
            'telefone' => isset($input['telefone']) ? trim($input['telefone']) : null,
            'bloqueado' => isset($input['bloqueado']) ? (int)$input['bloqueado'] : 0,
            'perfil' => trim($input['perfil']),
            'foto' => isset($input['foto']) ? trim($input['foto']) : null
        ];
        
        $stmt = $pdo->prepare("INSERT INTO usuarios (nome, cpf, email, senha, telefone, bloqueado, perfil, foto, criado_em, atualizado_em) VALUES (?, ?, ?, ?, ?, ?, ?, ?, NOW(), NOW())");
        $stmt->execute(array_values($data));
        
        $id = $pdo->lastInsertId();
        
        // Remover a senha do retorno por segurança
        unset($data['senha']);
        
        echo json_encode([
            'success' => true,
            'message' => 'Usuário criado com sucesso',
            'data' => array_merge(['id' => $id], $data)
        ]);
    } catch (PDOException $e) {
        http_response_code(500);
        echo json_encode([
            'success' => false,
            'error' => 'Erro ao criar usuário: ' . $e->getMessage()
        ]);
    }
}

// Função para atualizar um usuário
function updateUsuario($pdo, $id) {
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

        // Validação de campos obrigatórios (senha não é obrigatória na edição)
        $required_fields = ['nome', 'email', 'cpf', 'perfil'];
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
        
        // Validação do perfil
        $perfis_validos = ['atendente', 'gerente', 'admin'];
        if (!in_array(trim($input['perfil']), $perfis_validos)) {
            http_response_code(400);
            echo json_encode([
                'success' => false,
                'error' => 'Perfil inválido. Valores aceitos: ' . implode(', ', $perfis_validos)
            ]);
            return;
        }
        
        // Verificar se o usuário existe
        $stmt = $pdo->prepare("SELECT id FROM usuarios WHERE id = ? AND removido_em IS NULL");
        $stmt->execute([$id]);
        if (!$stmt->fetch()) {
            http_response_code(404);
            echo json_encode([
                'success' => false,
                'error' => 'Usuário não encontrado'
            ]);
            return;
        }
        
        // Verificar se já existe outro usuário com o mesmo CPF ou Email
        $stmt = $pdo->prepare("SELECT id FROM usuarios WHERE (cpf = ? OR email = ?) AND id != ? AND removido_em IS NULL");
        $stmt->execute([trim($input['cpf']), trim($input['email']), $id]);
        if ($stmt->fetch()) {
            http_response_code(409);
            echo json_encode([
                'success' => false,
                'error' => 'Já existe outro usuário com este CPF ou Email'
            ]);
            return;
        }

        // Prepara a query e os dados para atualização
        $query = "UPDATE usuarios SET nome = ?, cpf = ?, email = ?, telefone = ?, bloqueado = ?, perfil = ?, foto = ?, atualizado_em = NOW()";
        $params = [
            trim($input['nome']),
            trim($input['cpf']),
            trim($input['email']),
            isset($input['telefone']) ? trim($input['telefone']) : null,
            isset($input['bloqueado']) ? (int)$input['bloqueado'] : 0,
            trim($input['perfil']),
            isset($input['foto']) ? trim($input['foto']) : null
        ];

        // Se uma nova senha for fornecida, adicione-a à query e aos parâmetros
        if (isset($input['senha']) && !empty(trim($input['senha']))) {
            // Validação da senha (mínimo 6 caracteres)
            if (strlen(trim($input['senha'])) < 6) {
                http_response_code(400);
                echo json_encode([
                    'success' => false,
                    'error' => 'A senha deve ter pelo menos 6 caracteres'
                ]);
                return;
            }
            
            $hashed_password = password_hash(trim($input['senha']), PASSWORD_DEFAULT);
            $query .= ", senha = ?";
            $params[] = $hashed_password;
        }

        $query .= " WHERE id = ?";
        $params[] = $id;

        $stmt = $pdo->prepare($query);
        $stmt->execute($params);

        // Remover a senha do retorno por segurança
        if (isset($input['senha'])) {
            unset($input['senha']);
        }

        echo json_encode([
            'success' => true,
            'message' => 'Usuário atualizado com sucesso',
            'data' => $input
        ]);

    } catch (PDOException $e) {
        http_response_code(500);
        echo json_encode([
            'success' => false,
            'error' => 'Erro ao atualizar usuário: ' . $e->getMessage()
        ]);
    }
}

// Função para excluir um usuário (soft delete)
function deleteUsuario($pdo, $id) {
    try {
        // Verificar se o usuário existe
        $stmt = $pdo->prepare("SELECT id FROM usuarios WHERE id = ? AND removido_em IS NULL");
        $stmt->execute([$id]);
        if (!$stmt->fetch()) {
            http_response_code(404);
            echo json_encode([
                'success' => false,
                'error' => 'Usuário não encontrado'
            ]);
            return;
        }
        
        // Verificar se o usuário está sendo usado em algum atendimento ou andamento
        $stmt_atendimento = $pdo->prepare("SELECT COUNT(*) as count FROM atendimentos WHERE atendente_id = ? AND removido_em IS NULL");
        $stmt_atendimento->execute([$id]);
        $result_atendimento = $stmt_atendimento->fetch(PDO::FETCH_ASSOC);

        $stmt_andamento = $pdo->prepare("SELECT COUNT(*) as count FROM andamentos WHERE usuario_id = ? AND removido_em IS NULL");
        $stmt_andamento->execute([$id]);
        $result_andamento = $stmt_andamento->fetch(PDO::FETCH_ASSOC);
        
        if ($result_atendimento['count'] > 0 || $result_andamento['count'] > 0) {
            http_response_code(409);
            echo json_encode([
                'success' => false,
                'error' => 'Não é possível excluir este usuário pois ele está sendo usado em atendimentos ou andamentos'
            ]);
            return;
        }
        
        // Realizar soft delete
        $stmt = $pdo->prepare("UPDATE usuarios SET removido_em = NOW() WHERE id = ?");
        $stmt->execute([$id]);
        
        echo json_encode([
            'success' => true,
            'message' => 'Usuário excluído com sucesso'
        ]);
    } catch (PDOException $e) {
        http_response_code(500);
        echo json_encode([
            'success' => false,
            'error' => 'Erro ao excluir usuário: ' . $e->getMessage()
        ]);
    }
}
?>

