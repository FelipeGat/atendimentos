<?php
/**
 * API de Atendimentos
 * Sistema de Gerenciamento de Atendimentos
 */

define('DEVELOPMENT_MODE', true);

// Definir cabeçalhos CORS
header("Content-Type: application/json; charset=UTF-8");
header("Access-Control-Allow-Origin: http://localhost:3000");
header("Access-Control-Allow-Methods: GET, POST, PUT, DELETE, OPTIONS");
header("Access-Control-Allow-Headers: Content-Type, Authorization, X-Empresa-ID, X-Requested-With");
header("Access-Control-Allow-Credentials: true");

// Incluir configurações
require_once __DIR__ . "/../config/db.php";
require_once __DIR__ . "/../config/util.php";

// Sobrescrever função para aceitar também via query string (para testes)
function obterEmpresaId() {
    $headers = getallheaders();
    if (!empty($headers['X-Empresa-ID'])) {
        return intval($headers['X-Empresa-ID']);
    }
    if (!empty($_GET['empresa_id'])) {
        return intval($_GET['empresa_id']);
    }
    return null;
}

// Roteamento
$method = $_SERVER['REQUEST_METHOD'];
$id = $_GET['id'] ?? null;

switch ($method) {
    case 'OPTIONS':
        http_response_code(200);
        exit();
    case 'GET':
        try {
            $empresa_id = obterEmpresaId();
            if (!$empresa_id) {
                responderErro('ID da empresa não fornecido (use cabeçalho X-Empresa-ID ou ?empresa_id=)', 400);
            }
            handleGet($conn, $empresa_id, $id);
        } catch (Exception $e) {
            responderErro('Erro interno do servidor: ' . $e->getMessage(), 500);
        }
        break;
    case 'POST':
        try {
            $empresa_id = obterEmpresaId();
            if (!$empresa_id) {
                responderErro('ID da empresa não fornecido', 400);
            }
            handlePost($conn, $empresa_id);
        } catch (Exception $e) {
            responderErro('Erro interno do servidor: ' . $e->getMessage(), 500);
        }
        break;
    case 'PUT':
        try {
            $empresa_id = obterEmpresaId();
            if (!$empresa_id) {
                responderErro('ID da empresa não fornecido', 400);
            }
            handlePut($conn, $empresa_id, $id);
        } catch (Exception $e) {
            responderErro('Erro interno do servidor: ' . $e->getMessage(), 500);
        }
        break;
    case 'DELETE':
        try {
            $empresa_id = obterEmpresaId();
            if (!$empresa_id) {
                responderErro('ID da empresa não fornecido', 400);
            }
            if (!$id) {
                parse_str(file_get_contents("php://input"), $d);
                $id = $d['id'] ?? null;
            }
            handleDelete($conn, $empresa_id, $id);
        } catch (Exception $e) {
            responderErro('Erro interno do servidor: ' . $e->getMessage(), 500);
        }
        break;
    default:
        responderErro('Método não permitido', 405);
        break;
}

/**
 * Funções de manipuladores
 */
function handleGet($conn, $empresa_id, $id = null)
{
    try {
        if ($id) {
            $sql = "SELECT * FROM atendimentos 
                    WHERE id = ? AND empresa_id = ? AND removido_em IS NULL 
                    LIMIT 1";
            $stmt = $conn->prepare($sql);
            if (!$stmt) {
                responderErro("Erro no prepare (GET ID): " . $conn->error, 500);
            }
            $stmt->bind_param("ii", $id, $empresa_id);
            if (!$stmt->execute()) {
                responderErro("Erro no execute (GET ID): " . $stmt->error, 500);
            }
            $result = $stmt->get_result();
            $row = $result->fetch_assoc();

            if ($row) {
                responderSucesso('Atendimento encontrado', $row);
            } else {
                responderErro('Atendimento não encontrado', 404);
            }
        } else {
            $status = $_GET['status'] ?? null;
            $search = $_GET['search'] ?? null;

            $sql = "SELECT a.*, 
                           c.nome AS cliente_nome, 
                           u.nome AS atendente_nome, 
                           eq.nome AS equipamento_nome, 
                           ass.nome AS assunto_nome 
                    FROM atendimentos a 
                    INNER JOIN clientes c ON c.id = a.cliente_id 
                    INNER JOIN usuarios u ON u.id = a.atendente_id 
                    LEFT JOIN equipamentos eq ON eq.id = a.equipamento_id
                    LEFT JOIN assuntos ass ON ass.id = a.assunto_id
                    WHERE a.empresa_id = ? AND a.removido_em IS NULL";

            $params = [$empresa_id];
            $types = "i";

            if ($status && $status !== 'todos') {
                $sql .= " AND a.status = ?";
                $params[] = $status;
                $types .= "s";
            }
            if ($search) {
                $sql .= " AND (a.descricao LIKE ? OR a.observacoes LIKE ? 
                            OR c.nome LIKE ? OR u.nome LIKE ?)";
                $like = "%" . $search . "%";
                $params = array_merge($params, [$like, $like, $like, $like]);
                $types .= "ssss";
            }

            $sql .= " ORDER BY a.criado_em DESC";
            
            $stmt = $conn->prepare($sql);
            if (!$stmt) {
                responderErro("Erro no prepare (GET ALL): " . $conn->error, 500);
            }

            $stmt->bind_param($types, ...$params);
            
            if (!$stmt->execute()) {
                responderErro("Erro no execute (GET ALL): " . $stmt->error, 500);
            }
            
            $result = $stmt->get_result();
            $rows = $result->fetch_all(MYSQLI_ASSOC);

            responderSucesso('Atendimentos listados', $rows);
        }
    } catch (Exception $e) {
        responderErro("Erro geral ao buscar atendimentos: " . $e->getMessage(), 500);
    }
}

function handlePost($conn, $empresa_id)
{
    try {
        $data = json_decode(file_get_contents("php://input"));
        $required_fields = ['cliente_id', 'assunto_id', 'equipamento_id', 'atendente_id', 'descricao', 'prioridade', 'status'];

        foreach ($required_fields as $field) {
            if (!isset($data->$field)) {
                responderErro("Campo '$field' é obrigatório", 400);
            }
        }

        $sql = "INSERT INTO atendimentos 
                   (cliente_id, assunto_id, equipamento_id, atendente_id, 
                    descricao, observacoes, solucao, prioridade, status, 
                    criado_em, empresa_id) 
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, NOW(), ?)";
        $stmt = $conn->prepare($sql);
        if (!$stmt) {
            responderErro("Erro no prepare (POST): " . $conn->error, 500);
        }

        $cliente_id = $data->cliente_id;
$assunto_id = $data->assunto_id;
$equipamento_id = $data->equipamento_id ?? null;
$atendente_id = $data->atendente_id ?? null;
$descricao = $data->descricao;
$observacoes = $data->observacoes ?? '';
$solucao = $data->solucao ?? '';
$prioridade = $data->prioridade;
$status = $data->status;

$stmt->bind_param(
    "iiiisssssi",
    $cliente_id,
    $assunto_id,
    $equipamento_id,
    $atendente_id,
    $descricao,
    $observacoes,
    $solucao,
    $prioridade,
    $status,
    $empresa_id
);


        if ($stmt->execute()) {
            responderSucesso('Atendimento criado com sucesso', ['id' => $conn->insert_id], 201);
        } else {
            responderErro('Erro ao criar atendimento: ' . $stmt->error, 500);
        }
    } catch (Exception $e) {
        responderErro('Erro ao criar atendimento: ' . $e->getMessage(), 500);
    }
}

function handlePut($conn, $empresa_id, $id)
{
    try {
        $data = json_decode(file_get_contents("php://input"));
        if (!$id) {
            responderErro('ID do atendimento é obrigatório', 400);
        }

        $fields = [];
        $params = [];
        $types = "";

        foreach (['cliente_id'=>'i','assunto_id'=>'i','equipamento_id'=>'i','atendente_id'=>'i','descricao'=>'s','observacoes'=>'s','solucao'=>'s','prioridade'=>'s','status'=>'s'] as $campo => $tipo) {
            if (isset($data->$campo)) {
                $fields[] = "$campo = ?";
                $params[] = $data->$campo;
                $types .= $tipo;
            }
        }

        if (empty($fields)) {
            responderErro('Nenhum campo válido para atualizar', 400);
        }

        $types .= "ii";
        $params[] = $id;
        $params[] = $empresa_id;

        $sql = "UPDATE atendimentos 
                   SET " . implode(', ', $fields) . ", atualizado_em = NOW() 
                 WHERE id = ? AND empresa_id = ? AND removido_em IS NULL";
        $stmt = $conn->prepare($sql);
        if (!$stmt) {
            responderErro("Erro no prepare (PUT): " . $conn->error, 500);
        }

        $stmt->bind_param($types, ...$params);

        if ($stmt->execute()) {
            responderSucesso('Atendimento atualizado com sucesso');
        } else {
            responderErro('Erro ao atualizar atendimento: ' . $stmt->error, 500);
        }
    } catch (Exception $e) {
        responderErro('Erro ao atualizar atendimento: ' . $e->getMessage(), 500);
    }
}

function handleDelete($conn, $empresa_id, $id)
{
    try {
        if (!$id) {
            responderErro('ID do atendimento é obrigatório', 400);
        }

        $sql = "UPDATE atendimentos 
                   SET removido_em = NOW() 
                 WHERE id = ? AND empresa_id = ? AND removido_em IS NULL";
        $stmt = $conn->prepare($sql);
        if (!$stmt) {
            responderErro("Erro no prepare (DELETE): " . $conn->error, 500);
        }
        $stmt->bind_param("ii", $id, $empresa_id);

        if ($stmt->execute()) {
            responderSucesso('Atendimento excluído com sucesso');
        } else {
            responderErro('Erro ao excluir atendimento: ' . $stmt->error, 500);
        }
    } catch (Exception $e) {
        responderErro('Erro ao excluir atendimento: ' . $e->getMessage(), 500);
    }
}
