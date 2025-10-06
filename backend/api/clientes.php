<?php
/**
 * API de Clientes
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

// Logar todos os headers recebidos para depuração
error_log('[CLIENTES DEBUG] HEADERS: ' . json_encode(getallheaders()));

try {
    $conn = getConnection(); // Adiciona a inicialização da conexão
    if (!$conn) {
        throw new Exception("Falha ao obter conexão com o banco de dados.");
    }

    // Obter e validar empresa_id
    $empresa_id = obterEmpresaId();
    if (!$empresa_id && DEVELOPMENT_MODE) {
        $empresa_id = 1; // ID padrão para desenvolvimento
    }

    if (!$empresa_id) {
        responderErro('ID da empresa não fornecido no cabeçalho X-Empresa-ID', 400);
    }

} catch (Exception $e) {
    error_log("Erro na inicialização da API de clientes: " . $e->getMessage());
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
 * Listar clientes ou buscar por ID
 */
function handleGet($conn, $empresa_id, $id) {
    try {
        if ($id) {
            // Buscar cliente específico com PDO
            $stmt = $conn->prepare("
                SELECT c.id, c.nome, c.email, c.telefone, c.cpf_cnpj, c.logradouro, c.cidade, c.estado, c.cep, c.observacoes, c.ativo, c.criado_em, c.atualizado_em,
                       GROUP_CONCAT(cs.segmento_id) AS segmentos_ids
                FROM clientes c
                LEFT JOIN cliente_segmentos cs ON c.id = cs.cliente_id
                WHERE c.id = ? AND c.empresa_id = ? AND c.removido_em IS NULL
                GROUP BY c.id
            ");
            $stmt->execute([$id, $empresa_id]);
            $cliente = $stmt->fetch(PDO::FETCH_ASSOC);
            
            if (!$cliente) {
                responderErro('Cliente não encontrado', 404);
            }

            $cliente['ativo'] = (int)$cliente['ativo'];
            $cliente['segmentos_ids'] = $cliente['segmentos_ids'] ? array_map('intval', explode(',', $cliente['segmentos_ids'])) : [];
            
            responderSucesso('Cliente encontrado', $cliente);
            
        } else {
            // Listar todos os clientes com PDO
            $filtro_status = isset($_GET['status']) && $_GET['status'] === 'ativo' ? " AND c.ativo = 1" : "";

            $sql = "
                SELECT c.id, c.nome, c.email, c.telefone, c.cpf_cnpj, c.logradouro, c.cidade, c.estado, c.cep, c.observacoes, c.ativo, c.criado_em, c.atualizado_em,
                    GROUP_CONCAT(cs.segmento_id) AS segmentos_ids
                FROM clientes c
                LEFT JOIN cliente_segmentos cs ON c.id = cs.cliente_id
                WHERE c.empresa_id = ? AND c.removido_em IS NULL {$filtro_status}
                GROUP BY c.id
                ORDER BY c.id DESC
            ";
            
            $stmt = $conn->prepare($sql);
            $stmt->execute([$empresa_id]);
            $clientes = $stmt->fetchAll(PDO::FETCH_ASSOC);

            foreach ($clientes as &$cliente) {
                $cliente['ativo'] = (int)$cliente['ativo'];
                $cliente['segmentos_ids'] = $cliente['segmentos_ids'] ? array_map('intval', explode(',', $cliente['segmentos_ids'])) : [];
            }
            
            responderSucesso('Clientes listados com sucesso', $clientes);
        }
        
    } catch (Exception $e) {
        error_log("Erro ao buscar clientes: " . $e->getMessage());
        responderErro('Erro ao buscar clientes: ' . $e->getMessage(), 500);
    }
}

/**
 * Criar novo cliente
 */
function handlePost($conn, $empresa_id) {
    try {
        $input = json_decode(file_get_contents('php://input'), true);

        if (!$input || !isset($input['nome']) || empty(trim($input['nome']))) {
            responderErro('Nome do cliente é obrigatório', 400);
        }

        $nome = trim($input['nome']);
        $email = isset($input['email']) ? trim($input['email']) : null;
        $telefone = isset($input['telefone']) ? trim($input['telefone']) : null;
        $cpf_cnpj = isset($input['cpf_cnpj']) ? preg_replace('/\D/', '', trim($input['cpf_cnpj'])) : null;
        $logradouro = $input['logradouro'] ?? null;
        $cidade = $input['cidade'] ?? null;
        $estado = $input['estado'] ?? null;
        $cep = isset($input['cep']) ? preg_replace('/\D/', '', $input['cep']) : null;
        $segmentos_ids = $input['segmentos_ids'] ?? [];
        $observacoes = $input['observacoes'] ?? null;
        $ativo = isset($input['ativo']) ? (int)$input['ativo'] : 1;

        if ($cpf_cnpj && !validarDocumento($cpf_cnpj)) {
            responderErro('CPF/CNPJ inválido', 400);
        }

        if ($cpf_cnpj) {
            $stmt = $conn->prepare("SELECT id FROM clientes WHERE cpf_cnpj = ? AND empresa_id = ? AND removido_em IS NULL");
            $stmt->execute([$cpf_cnpj, $empresa_id]);
            if ($stmt->fetch()) {
                responderErro('CPF/CNPJ já cadastrado para outro cliente', 409);
            }
        }

        $conn->beginTransaction();

        $stmt = $conn->prepare("
            INSERT INTO clientes (nome, email, telefone, cpf_cnpj, logradouro, cidade, estado, cep, observacoes, ativo, empresa_id) 
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        ");
        
        $params = [$nome, $email, $telefone, $cpf_cnpj, $logradouro, $cidade, $estado, $cep, $observacoes, $ativo, $empresa_id];

        if ($stmt->execute($params)) {
            $lastId = $conn->lastInsertId();

            if (!empty($segmentos_ids)) {
                $stmtSegmento = $conn->prepare("INSERT INTO cliente_segmentos (cliente_id, segmento_id) VALUES (?, ?)");
                foreach ($segmentos_ids as $segmento_id) {
                    $stmtSegmento->execute([$lastId, (int)$segmento_id]);
                }
            }

            $conn->commit();

            $stmt = $conn->prepare("SELECT * FROM clientes WHERE id = ?");
            $stmt->execute([$lastId]);
            $cliente = $stmt->fetch(PDO::FETCH_ASSOC);
            $cliente['ativo'] = (int)$cliente['ativo'];

            responderSucesso('Cliente criado com sucesso', $cliente, 201);
        } else {
            $conn->rollBack();
            $errorInfo = $stmt->errorInfo();
            responderErro('Erro ao criar cliente: ' . ($errorInfo[2] ?? 'Erro desconhecido'), 500);
        }

    } catch (Exception $e) {
        if ($conn->inTransaction()) {
            $conn->rollBack();
        }
        error_log("Erro ao criar cliente: " . $e->getMessage());
        responderErro('Dados inválidos ou erro interno: ' . $e->getMessage(), 400);
    }
}

/**
 * Atualizar cliente
 */
function handlePut($conn, $empresa_id) {
    try {
        $input = json_decode(file_get_contents('php://input'), true);
        error_log('[CLIENTES DEBUG] handlePut - empresa_id=' . var_export($empresa_id, true) . ' input=' . json_encode($input));

        if (!isset($input['id'])) {
            responderErro('ID do cliente é obrigatório', 400);
        }
        $id = (int)$input['id'];

        $conn->beginTransaction();

        $stmt = $conn->prepare("SELECT id FROM clientes WHERE id = ? AND empresa_id = ? AND removido_em IS NULL");
        $stmt->execute([$id, $empresa_id]);
        $row = $stmt->fetch();
        error_log('[CLIENTES DEBUG] handlePut - resultado SELECT id: ' . var_export($row, true));
        if (!$row) {
            $conn->rollBack();
            responderErro('Cliente não encontrado', 404);
        }

        $fields = [];
        $params = [];

        $allowed_fields = ['nome', 'email', 'telefone', 'cpf_cnpj', 'logradouro', 'cidade', 'estado', 'cep', 'observacoes', 'ativo'];

        foreach ($allowed_fields as $field) {
            if (isset($input[$field])) {
                $value = trim($input[$field]);
                
                if ($field === 'nome' && empty($value)) {
                    responderErro('Nome não pode ser vazio', 400);
                }

                if ($field === 'cpf_cnpj') {
                    $value = preg_replace('/\D/', '', $value);
                    if (!empty($value) && !validarDocumento($value)) {
                        responderErro('CPF/CNPJ inválido', 400);
                    }

                    $stmtCheck = $conn->prepare("SELECT id FROM clientes WHERE cpf_cnpj = ? AND empresa_id = ? AND id != ? AND removido_em IS NULL");
                    $stmtCheck->execute([$value, $empresa_id, $id]);
                    if ($stmtCheck->fetch()) {
                        responderErro('CPF/CNPJ já cadastrado para outro cliente', 409);
                    }
                }

                $fields[] = "`$field` = ?";
                $params[] = $value;
            }
        }

        if (empty($fields)) {
            $conn->rollBack();
            responderErro('Nenhum campo válido para atualizar', 400);
        }

        $fields[] = "atualizado_em = NOW()";
        $sql = "UPDATE clientes SET " . implode(', ', $fields) . " WHERE id = ? AND empresa_id = ?";
        $params[] = $id;
        $params[] = $empresa_id;

        $stmt = $conn->prepare($sql);
        if (!$stmt->execute($params)) {
            $conn->rollBack();
            $errorInfo = $stmt->errorInfo();
            responderErro('Erro ao atualizar cliente: ' . ($errorInfo[2] ?? 'Erro desconhecido'), 500);
        }

        if (isset($input['segmentos_ids']) && is_array($input['segmentos_ids'])) {
            $stmtDel = $conn->prepare("DELETE FROM cliente_segmentos WHERE cliente_id = ?");
            $stmtDel->execute([$id]);

            $stmtIns = $conn->prepare("INSERT INTO cliente_segmentos (cliente_id, segmento_id) VALUES (?, ?)");
            foreach ($input['segmentos_ids'] as $segmento_id) {
                if (!empty($segmento_id)) {
                    $stmtIns->execute([$id, (int)$segmento_id]);
                }
            }
        }

        $conn->commit();
        responderSucesso('Cliente atualizado com sucesso');

    } catch (Exception $e) {
        if ($conn->inTransaction()) {
            $conn->rollBack();
        }
        error_log("Erro ao atualizar cliente: " . $e->getMessage());
        responderErro('Erro ao atualizar cliente: ' . $e->getMessage(), 500);
    }
}

/**
 * Remover cliente (soft delete)
 */
function handleDelete($conn, $empresa_id, $id) {
    try {
        if (!$id) {
            responderErro('ID do cliente não fornecido na URL.', 400);
        }

        $conn->beginTransaction();

        $stmt = $conn->prepare("SELECT id FROM clientes WHERE id = ? AND empresa_id = ? AND removido_em IS NULL");
        $stmt->execute([$id, $empresa_id]);
        if (!$stmt->fetch()) {
            $conn->rollBack();
            responderErro('Cliente não encontrado ou já removido', 404);
        }

        $stmt = $conn->prepare("UPDATE clientes SET removido_em = NOW() WHERE id = ? AND empresa_id = ?");
        if ($stmt->execute([$id, $empresa_id])) {
            $conn->commit();
            responderSucesso('Cliente removido com sucesso');
        } else {
            $conn->rollBack();
            $errorInfo = $stmt->errorInfo();
            responderErro('Erro ao remover cliente: ' . ($errorInfo[2] ?? 'Erro desconhecido'), 500);
        }

    } catch (Exception $e) {
        if ($conn->inTransaction()) {
            $conn->rollBack();
        }
        error_log("Erro ao remover cliente: " . $e->getMessage());
        responderErro('Erro ao remover cliente: ' . $e->getMessage(), 500);
    }
}

/**
 * Validar CPF ou CNPJ
 */
function validarDocumento($documento) {
    $documento = preg_replace('/\D/', '', $documento);
    
    if (strlen($documento) == 11) {
        return validarCPF($documento);
    } elseif (strlen($documento) == 14) {
        return validarCNPJ($documento);
    }
    
    return false;
}

/**
 * Validar CPF
 */
function validarCPF($cpf) {
    if (strlen($cpf) != 11 || preg_match('/(\d)\1{10}/', $cpf)) {
        return false;
    }

    for ($t = 9; $t < 11; $t++) {
        for ($d = 0, $c = 0; $c < $t; $c++) {
            $d += $cpf[$c] * (($t + 1) - $c);
        }
        $d = ((10 * $d) % 11) % 10;
        if ($cpf[$c] != $d) {
            return false;
        }
    }

    return true;
}

/**
 * Validar CNPJ
 */
function validarCNPJ($cnpj) {
    $cnpj = preg_replace('/[^0-9]/', '', (string) $cnpj);

    // Valida tamanho
    if (strlen($cnpj) != 14) {
        return false;
    }

    // Valida sequências invalidas
    if (preg_match('/(\d)\1{13}/', $cnpj)) {
        return false;
    }

    // Valida dígitos verificadores
    for ($i = 0, $j = 5, $soma = 0; $i < 12; $i++) {
        $soma += $cnpj[$i] * $j;
        $j = ($j == 2) ? 9 : $j - 1;
    }
    $resto = $soma % 11;
    if ($cnpj[12] != ($resto < 2 ? 0 : 11 - $resto)) {
        return false;
    }

    for ($i = 0, $j = 6, $soma = 0; $i < 13; $i++) {
        $soma += $cnpj[$i] * $j;
        $j = ($j == 2) ? 9 : $j - 1;
    }
    $resto = $soma % 11;
    if ($cnpj[13] != ($resto < 2 ? 0 : 11 - $resto)) {
        return false;
    }

    return true;
}

/**
 * Função para obter empresa_id do cabeçalho HTTP
 */
function obterEmpresaId() {
    // Tenta obter cabeçalhos de múltiplas fontes para máxima compatibilidade
    $headers = [];
    if (function_exists('getallheaders')) {
        $headers = getallheaders();
    }

    // Normaliza as chaves para minúsculas
    $headers = array_change_key_case($headers, CASE_LOWER);

    if (isset($headers['x-empresa-id'])) {
        return (int)$headers['x-empresa-id'];
    }

    if (isset($_SERVER['HTTP_X_EMPRESA_ID'])) {
        return (int)$_SERVER['HTTP_X_EMPRESA_ID'];
    }

    return null;
}
?>

