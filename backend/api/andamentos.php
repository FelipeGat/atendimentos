<?php
/**
 * backend/api/andamentos.php
 * API para gerenciar andamentos (histórico) dos atendimentos
 */

header('Content-Type: application/json');
define('DEVELOPMENT_MODE', true);

// Definir cabeçalhos CORS
header("Content-Type: application/json; charset=UTF-8");
header("Access-Control-Allow-Origin: http://localhost:3000");
header("Access-Control-Allow-Methods: GET, POST, PUT, DELETE, OPTIONS");
header("Access-Control-Allow-Headers: Content-Type, Authorization, X-Empresa-ID, X-Requested-With");
header("Access-Control-Allow-Credentials: true");

// includes (ajuste caminhos se necessário)
require_once __DIR__ . "/../config/db.php";
require_once __DIR__ . "/../config/util.php";

$method = $_SERVER['REQUEST_METHOD'];
// aceitar id via query string ou via payload (delete)
$id = isset($_GET['id']) ? (int)$_GET['id'] : null;

switch ($method) {
    case 'OPTIONS':
        // Responde ao preflight request e sai
        http_response_code(200);
        exit();
        break;
    case 'GET':
        try {
            $empresa_id = obterEmpresaId();
            if (!$empresa_id) {
                responderErro('ID da empresa não fornecido no cabeçalho X-Empresa-ID', 400);
            }
        } catch (Exception $e) {
            responderErro('Erro interno do servidor', 500);
        }
        handleGet($conn, $empresa_id, $id);
        break;
    case 'POST':
        try {
            $empresa_id = obterEmpresaId();
            if (!$empresa_id) {
                responderErro('ID da empresa não fornecido no cabeçalho X-Empresa-ID', 400);
            }
        } catch (Exception $e) {
            responderErro('Erro interno do servidor', 500);
        }
        handlePost($conn, $empresa_id);
        break;
    case 'DELETE':
        try {
            $empresa_id = obterEmpresaId();
            if (!$empresa_id) {
                responderErro('ID da empresa não fornecido no cabeçalho X-Empresa-ID', 400);
            }
        } catch (Exception $e) {
            responderErro('Erro interno do servidor', 500);
        }
        if (!$id) {
            parse_str(file_get_contents("php://input"), $d);
            $id = isset($d['id']) ? (int)$d['id'] : null;
        }
        handleDelete($conn, $empresa_id, $id);
        break;
    default:
        responderErro('Método não permitido', 405);
        break;
}

/**
 * GET handler
 */
function handleGet($conn, $empresa_id, $id)
{
    try {
        $atendimento_id = isset($_GET['atendimento_id']) ? (int)$_GET['atendimento_id'] : null;
        if (!$atendimento_id) {
            responderErro('ID do atendimento é obrigatório', 400);
        }

        $sql = "
            SELECT an.*, u.nome AS usuario_nome
            FROM andamentos an
            INNER JOIN atendimentos a ON a.id = an.atendimento_id
            INNER JOIN usuarios u ON u.id = an.usuario_id
            WHERE an.atendimento_id = ? AND a.empresa_id = ? AND an.removido_em IS NULL
            ORDER BY an.criado_em ASC
        ";
        $stmt = $conn->prepare($sql);
        $stmt->bind_param("ii", $atendimento_id, $empresa_id);
        $stmt->execute();
        $result = $stmt->get_result();
        $rows = $result->fetch_all(MYSQLI_ASSOC);

        responderSucesso('Andamentos listados', $rows);
    } catch (Exception $e) {
        error_log("Erro ao buscar andamentos: " . $e->getMessage());
        responderErro('Erro ao buscar andamentos', 500);
    }
}

/**
 * POST handler -> cria novo andamento
 */
function handlePost($conn, $empresa_id)
{
    try {
        $data = json_decode(file_get_contents("php://input"));
        $required_fields = ['descricao', 'atendimento_id', 'usuario_id'];
        
        foreach ($required_fields as $field) {
            if (!isset($data->$field)) {
                throw new Exception("Campo '$field' é obrigatório");
            }
        }

        $atendimento_id = (int)$data->atendimento_id;
        $usuario_id = (int)$data->usuario_id;
        $descricao = $data->descricao;

        // Validar se atendimento pertence à empresa
        $stmt = $conn->prepare("SELECT id FROM atendimentos WHERE id = ? AND empresa_id = ? AND removido_em IS NULL");
        $stmt->bind_param("ii", $atendimento_id, $empresa_id);
        $stmt->execute();
        $result = $stmt->get_result();
        if (!$result->fetch_assoc()) {
            responderErro('Atendimento não encontrado ou não pertence à empresa', 404);
        }
        
        $sql = "INSERT INTO andamentos (descricao, atendimento_id, usuario_id, criado_em) VALUES (?, ?, ?, NOW())";
        $stmt = $conn->prepare($sql);
        $stmt->bind_param("sii", $descricao, $atendimento_id, $usuario_id);
        $stmt->execute();

        $newId = $conn->insert_id;

        responderSucesso('Andamento criado com sucesso', ['id' => $newId], 201);
    } catch (Exception $e) {
        error_log("Erro geral ao criar andamento: " . $e->getMessage());
        responderErro('Erro ao criar andamento', 500);
    }
}

/**
 * DELETE handler -> soft-delete do andamento
 */
function handleDelete($conn, $empresa_id, $id)
{
    try {
        if (!$id) {
            responderErro('ID do andamento é obrigatório', 400);
        }

        // Verificar se andamento existe e pertence à empresa (via atendimento)
        $stmt = $conn->prepare("
            SELECT an.id
            FROM andamentos an
            INNER JOIN atendimentos a ON a.id = an.atendimento_id
            WHERE an.id = ? AND a.empresa_id = ? AND an.removido_em IS NULL
            LIMIT 1
        ");
        $stmt->bind_param("ii", $id, $empresa_id);
        $stmt->execute();
        $result = $stmt->get_result();
        if (!$result->fetch_assoc()) {
            responderErro('Andamento não encontrado ou não pertence à empresa', 404);
        }

        $d = $conn->prepare("UPDATE andamentos SET removido_em = NOW() WHERE id = ?");
        $d->bind_param("i", $id);
        if ($d->execute()) {
            responderSucesso('Andamento excluído com sucesso');
        } else {
            responderErro('Erro ao excluir andamento', 500);
        }
    } catch (Exception $e) {
        error_log("Erro ao excluir andamento: " . $e->getMessage());
        responderErro('Erro ao excluir andamento', 500);
    }
}