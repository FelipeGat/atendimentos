<?php
/**
 * API de Clientes
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
            // Buscar cliente específico
            $stmt = $conn->prepare("
                SELECT c.id, c.nome, c.email, c.telefone, c.cpf_cnpj, c.logradouro, c.cidade, c.estado, c.cep, c.observacoes, c.ativo, c.criado_em, c.atualizado_em,
                s.nome AS nome_segmento, s.id AS segmento_id
                FROM clientes c
                LEFT JOIN segmentos s ON c.segmento_id = s.id
                WHERE c.id = ? AND c.empresa_id = ? AND c.removido_em IS NULL
            ");
            if (!$stmt) {
                responderErro("Erro na preparação da consulta: " . $conn->error, 500);
            }
            $stmt->bind_param("ii", $id, $empresa_id);
            $stmt->execute();
            $result = $stmt->get_result();
            $cliente = $result->fetch_assoc();
            
            if (!$cliente) {
                responderErro('Cliente não encontrado', 404);
            }

            // Garante que o status seja retornado como um número
            $cliente['ativo'] = (int)$cliente['ativo'];
            
            responderSucesso('Cliente encontrado', $cliente);
            
        } else {
            // Listar todos os clientes, com opção de filtrar por status
            $filtro_status = isset($_GET['status']) && $_GET['status'] === 'ativo' ? " AND c.ativo = 1" : "";

            $stmt = $conn->prepare("
                SELECT c.id, c.nome, c.email, c.telefone, c.cpf_cnpj, c.logradouro, c.cidade, c.estado, c.cep, c.observacoes, c.ativo, c.criado_em, c.atualizado_em,
                    GROUP_CONCAT(cs.segmento_id) AS segmentos_ids
                FROM clientes c
                LEFT JOIN cliente_segmentos cs ON c.id = cs.cliente_id
                WHERE c.empresa_id = ? AND c.removido_em IS NULL {$filtro_status}
                GROUP BY c.id
                ORDER BY c.id DESC
            ");
            if (!$stmt) {
                responderErro("Erro na preparação da consulta: " . $conn->error, 500);
            }
            $stmt->bind_param("i", $empresa_id);
            $stmt->execute();
            $result = $stmt->get_result();
            $clientes = $result->fetch_all(MYSQLI_ASSOC);

            // Ajustar o campo segmentos_ids para ser array e ativo para int
            foreach ($clientes as &$cliente) {
                $cliente['ativo'] = (int)$cliente['ativo'];
                if ($cliente['segmentos_ids']) {
                    $cliente['segmentos_ids'] = array_map('intval', explode(',', $cliente['segmentos_ids']));
                } else {
                    $cliente['segmentos_ids'] = [];
                }
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

        // Validar dados obrigatórios
        if (!$input || !isset($input['nome']) || empty(trim($input['nome']))) {
            responderErro('Nome do cliente é obrigatório', 400);
        }

        $nome = trim($input['nome']);
        $email = isset($input['email']) ? trim($input['email']) : null;
        $telefone = isset($input['telefone']) ? trim($input['telefone']) : null;
        $cpf_cnpj = isset($input['cpf_cnpj']) ? trim($input['cpf_cnpj']) : null;
        $logradouro = isset($input['logradouro']) ? trim($input['logradouro']) : null;
        $cidade = isset($input['cidade']) ? trim($input['cidade']) : null;
        $estado = isset($input['estado']) ? trim($input['estado']) : null;
        $cep = isset($input['cep']) ? trim($input['cep']) : null;
        $segmentos_ids = isset($input['segmentos_ids']) ? $input['segmentos_ids'] : [];
        $observacoes = isset($input['observacoes']) ? trim($input['observacoes']) : null;
        $ativo = isset($input['ativo']) ? (int)$input['ativo'] : 1;

        // Validar CPF/CNPJ se fornecido
        if ($cpf_cnpj) {
            $cpf_cnpj_limpo = preg_replace('/\D/', '', $cpf_cnpj);
            if (!validarDocumento($cpf_cnpj_limpo)) {
                if (strlen($cpf_cnpj_limpo) == 11) {
                    responderErro('CPF inválido', 400);
                } else if (strlen($cpf_cnpj_limpo) == 14) {
                    responderErro('CNPJ inválido', 400);
                } else {
                    responderErro('CPF/CNPJ inválido', 400);
                }
            }
        }

        // Verificar se CPF/CNPJ já existe (se fornecido)
        if ($cpf_cnpj) {
            $cpf_cnpj_limpo = preg_replace('/\D/', '', $cpf_cnpj);
            $stmt = $conn->prepare("
                SELECT id FROM clientes 
                WHERE cpf_cnpj = ? AND empresa_id = ? AND removido_em IS NULL
            ");
            if (!$stmt) {
                responderErro("Erro na preparação da consulta: " . $conn->error, 500);
            }
            $stmt->bind_param("si", $cpf_cnpj_limpo, $empresa_id);
            $stmt->execute();
            $result = $stmt->get_result();
            if ($result->num_rows > 0) {
                if (strlen($cpf_cnpj_limpo) == 11) {
                    responderErro('CPF já cadastrado para outro cliente', 409);
                } else {
                    responderErro('CNPJ já cadastrado para outro cliente', 409);
                }
            }
        }

        // Limpar CPF/CNPJ para armazenar apenas números
        if ($cpf_cnpj) {
            $cpf_cnpj = preg_replace('/\D/', '', $cpf_cnpj);
        }

        // Inserir novo cliente
        $stmt = $conn->prepare("
            INSERT INTO clientes (nome, email, telefone, cpf_cnpj, logradouro, cidade, estado, cep, observacoes, ativo, empresa_id) 
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        ");
        if (!$stmt) {
            responderErro("Erro na preparação da consulta: " . $conn->error, 500);
        }

        $stmt->bind_param("sssssssssis", 
            $nome, $email, $telefone, $cpf_cnpj, $logradouro, $cidade, $estado, $cep, $observacoes, $ativo, $empresa_id
        );

        if ($stmt->execute()) {
            $lastId = $conn->insert_id;

            // Inserir segmentos na tabela intermediária (cliente_segmentos)
            if (!empty($segmentos_ids)) {
                $stmtSegmento = $conn->prepare("INSERT INTO cliente_segmentos (cliente_id, segmento_id) VALUES (?, ?)");
                if (!$stmtSegmento) {
                    responderErro("Erro na preparação da consulta de segmentos: " . $conn->error, 500);
                }
                foreach ($segmentos_ids as $segmento_id) {
                    $segmento_id = (int)$segmento_id;
                    $stmtSegmento->bind_param("ii", $lastId, $segmento_id);
                    $stmtSegmento->execute();
                }
            }

            // Buscar o cliente criado para retornar
            $stmt = $conn->prepare("
                SELECT id, nome, email, telefone, cpf_cnpj, logradouro, cidade, estado, cep, observacoes, ativo, criado_em, atualizado_em
                FROM clientes 
                WHERE id = ?
            ");
            if (!$stmt) {
                responderErro("Erro na preparação da consulta: " . $conn->error, 500);
            }
            $stmt->bind_param("i", $lastId);
            $stmt->execute();
            $result = $stmt->get_result();
            $cliente = $result->fetch_assoc();
            $cliente['ativo'] = (int)$cliente['ativo'];

            responderSucesso('Cliente criado com sucesso', $cliente, 201);
        } else {
            responderErro('Erro ao criar cliente: ' . $stmt->error, 500);
        }

    } catch (Exception $e) {
        error_log("Erro ao criar cliente: " . $e->getMessage());
        responderErro('Dados inválidos: ' . $e->getMessage(), 400);
    }
}

/**
 * Atualizar cliente
 */
function handlePut($conn, $empresa_id) {
    try {
        $input = json_decode(file_get_contents('php://input'), true);

        if (!isset($input['id'])) {
            responderErro('ID do cliente é obrigatório', 400);
        }
        $id = $input['id'];

        // Verificar se o cliente existe
        $stmt = $conn->prepare("
            SELECT id FROM clientes 
            WHERE id = ? AND empresa_id = ? AND removido_em IS NULL
        ");
        if (!$stmt) {
            responderErro("Erro na preparação da consulta: " . $conn->error, 500);
        }
        $stmt->bind_param("ii", $id, $empresa_id);
        $stmt->execute();
        $result = $stmt->get_result();

        if ($result->num_rows === 0) {
            responderErro('Cliente não encontrado', 404);
        }

        // Preparar campos para atualização
        $fields = [];
        $params = [];
        $types = '';

        $allowed_fields = ['nome', 'email', 'telefone', 'cpf_cnpj', 'logradouro', 'cidade', 'estado', 'cep', 'segmento_id', 'observacoes', 'ativo'];

        foreach ($input as $key => $value) {
            if (in_array($key, $allowed_fields)) {
                if (in_array($key, ['nome']) && empty(trim($value))) {
                    responderErro('Nome não pode ser vazio', 400);
                }

                if ($key === 'cpf_cnpj' && $value !== null) {
                    $cpf_cnpj_limpo = preg_replace('/\D/', '', $value);
                    if (!validarDocumento($cpf_cnpj_limpo)) {
                        responderErro('CPF/CNPJ inválido', 400);
                    }
                    $value = $cpf_cnpj_limpo;

                    // Verificar duplicidade de CPF/CNPJ para outro cliente
                    $stmtCheck = $conn->prepare("
                        SELECT id FROM clientes WHERE cpf_cnpj = ? AND empresa_id = ? AND id != ? AND removido_em IS NULL
                    ");
                    if (!$stmtCheck) {
                        responderErro("Erro na preparação da consulta: " . $conn->error, 500);
                    }
                    $stmtCheck->bind_param("sii", $value, $empresa_id, $id);
                    $stmtCheck->execute();
                    $resCheck = $stmtCheck->get_result();
                    if ($resCheck->num_rows > 0) {
                        responderErro('CPF/CNPJ já cadastrado para outro cliente', 409);
                    }
                }

                if ($key === 'ativo') {
                    $value = (int)$value;
                }

                // Não atualizar segmento_id diretamente (assumindo segmento múltiplo), removemos este campo aqui
                if ($key === 'segmento_id') {
                    continue;
                }

                $fields[] = "$key = ?";
                $params[] = $value;
                $types .= 's';
            }
        }

        if (empty($fields)) {
            responderErro('Nenhum campo válido para atualizar', 400);
        }

        // Construir SQL de update
        $sql = "UPDATE clientes SET " . implode(', ', $fields) . ", atualizado_em = NOW() WHERE id = ? AND empresa_id = ?";
        $stmt = $conn->prepare($sql);
        if (!$stmt) {
            responderErro("Erro na preparação da consulta: " . $conn->error, 500);
        }

        // Adicionar tipos e parâmetros do WHERE
        $types .= 'ii';
        $params[] = $id;
        $params[] = $empresa_id;

        // Preparar bind_param com call_user_func_array
        $bind_names[] = $types;
        for ($i=0; $i<count($params); $i++) {
            $bind_names[] = &$params[$i];
        }
        call_user_func_array([$stmt, 'bind_param'], $bind_names);

        if (!$stmt->execute()) {
            responderErro('Erro ao atualizar cliente: ' . $stmt->error, 500);
        }

        // Atualizar segmentos (tabela intermediária)
        if (isset($input['segmentos_ids']) && is_array($input['segmentos_ids'])) {
            // Apagar segmentos antigos
            $stmtDel = $conn->prepare("DELETE FROM cliente_segmentos WHERE cliente_id = ?");
            if (!$stmtDel) {
                responderErro("Erro na preparação da consulta: " . $conn->error, 500);
            }
            $stmtDel->bind_param("i", $id);
            $stmtDel->execute();

            // Inserir novos segmentos
            $stmtIns = $conn->prepare("INSERT INTO cliente_segmentos (cliente_id, segmento_id) VALUES (?, ?)");
            if (!$stmtIns) {
                responderErro("Erro na preparação da consulta: " . $conn->error, 500);
            }
            foreach ($input['segmentos_ids'] as $segmento_id) {
                $segmento_id = (int)$segmento_id;
                $stmtIns->bind_param("ii", $id, $segmento_id);
                $stmtIns->execute();
            }
        }

        responderSucesso('Cliente atualizado com sucesso');

    } catch (Exception $e) {
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

        // Verificar se cliente existe
        $stmt = $conn->prepare("
            SELECT id FROM clientes 
            WHERE id = ? AND empresa_id = ? AND removido_em IS NULL
        ");
        if (!$stmt) {
            responderErro("Erro na preparação da consulta: " . $conn->error, 500);
        }
        $stmt->bind_param("ii", $id, $empresa_id);
        $stmt->execute();
        $result = $stmt->get_result();

        if ($result->num_rows === 0) {
            responderErro('Cliente não encontrado ou já removido', 404);
        }

        // Soft delete - marcar removido_em
        $stmt = $conn->prepare("
            UPDATE clientes SET removido_em = NOW() WHERE id = ? AND empresa_id = ?
        ");
        if (!$stmt) {
            responderErro("Erro na preparação da consulta: " . $conn->error, 500);
        }
        $stmt->bind_param("ii", $id, $empresa_id);
        if ($stmt->execute()) {
            responderSucesso('Cliente removido com sucesso');
        } else {
            responderErro('Erro ao remover cliente: ' . $stmt->error, 500);
        }

    } catch (Exception $e) {
        error_log("Erro ao remover cliente: " . $e->getMessage());
        responderErro('Erro ao remover cliente: ' . $e->getMessage(), 500);
    }
}

/**
 * Validar CPF ou CNPJ
 */
function validarDocumento($documento) {
    if (strlen($documento) == 11) {
        return validarCPF($documento);
    } elseif (strlen($documento) == 14) {
        return validarCNPJ($documento);
    }
    return false;
}

function validarCPF($cpf) {
    $cpf = preg_replace('/[^0-9]/', '', (string) $cpf);

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

function validarCNPJ($cnpj) {
    $cnpj = preg_replace('/[^0-9]/', '', (string) $cnpj);

    if (strlen($cnpj) != 14) {
        return false;
    }

    if (preg_match('/(\d)\1{13}/', $cnpj)) {
        return false;
    }

    $tamanho = strlen($cnpj) - 2;
    $numeros = substr($cnpj, 0, $tamanho);
    $digitos = substr($cnpj, $tamanho);
    $soma = 0;
    $pos = $tamanho - 7;

    for ($i = $tamanho; $i >= 1; $i--) {
        $soma += $numeros[$tamanho - $i] * $pos--;
        if ($pos < 2) {
            $pos = 9;
        }
    }

    $resultado = ($soma % 11) < 2 ? 0 : 11 - ($soma % 11);
    if ($resultado != $digitos[0]) {
        return false;
    }

    $tamanho += 1;
    $numeros = substr($cnpj, 0, $tamanho);
    $soma = 0;
    $pos = $tamanho - 7;

    for ($i = $tamanho; $i >= 1; $i--) {
        $soma += $numeros[$tamanho - $i] * $pos--;
        if ($pos < 2) {
            $pos = 9;
        }
    }

    $resultado = ($soma % 11) < 2 ? 0 : 11 - ($soma % 11);
    if ($resultado != $digitos[1]) {
        return false;
    }

    return true;
}

/**
 * Responder erro com código HTTP e mensagem JSON
 */
function responderErro($mensagem, $codigo = 400) {
    http_response_code($codigo);
    echo json_encode(['success' => false, 'message' => $mensagem]);
    exit;
}

/**
 * Responder sucesso com código HTTP e dados JSON
 */
function responderSucesso($mensagem, $dados = null, $codigo = 200) {
    http_response_code($codigo);
    $response = ['success' => true, 'message' => $mensagem];
    if (!is_null($dados)) {
        $response['data'] = $dados;
    }
    echo json_encode($response);
    exit;
}

/**
 * Função para obter empresa_id do cabeçalho HTTP
 */
function obterEmpresaId() {
    // A variável apache_request_headers() funciona para obter cabeçalhos
    $headers = function_exists('apache_request_headers') ? apache_request_headers() : [];

    $empresa_id = null;

    if (!empty($headers)) {
        foreach ($headers as $key => $value) {
            if (strtolower($key) === 'x-empresa-id') {
                $empresa_id = (int)$value;
                break;
            }
        }
    }

    return $empresa_id;
}
