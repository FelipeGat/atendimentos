<?php
/**
 * backend/api/anexos.php
 * API para upload, listagem e exclusão de anexos dos atendimentos
 */

header('Content-Type: application/json');
define('DEVELOPMENT_MODE', true);

// Definir cabeçalhos CORS
header("Content-Type: application/json; charset=UTF-8");
header("Access-Control-Allow-Origin: http://localhost:3000");
header("Access-Control-Allow-Methods: GET, POST, PUT, DELETE, OPTIONS");
header("Access-Control-Allow-Headers: Content-Type, Authorization, X-Empresa-ID, X-Requested-With");
header("Access-Control-Allow-Credentials: true");

// includes
require_once __DIR__ . "/../config/db.php";
require_once __DIR__ . "/../config/util.php";

$method = $_SERVER['REQUEST_METHOD'];
$id = isset($_GET['id']) ? (int)$_GET['id'] : null;
$atendimento_id = isset($_GET['atendimento_id']) ? (int)$_GET['atendimento_id'] : null;

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
        handleGet($conn, $empresa_id, $id, $atendimento_id);
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
 * GET -> lista anexos
 */
function handleGet($conn, $empresa_id, $id = null, $atendimento_id = null)
{
    try {
        if ($id) {
            $sql = "
                SELECT ax.*, a.empresa_id
                FROM anexos ax
                INNER JOIN atendimentos a ON a.id = ax.atendimento_id
                WHERE ax.id = ? AND a.empresa_id = ? AND ax.removido_em IS NULL
                LIMIT 1
            ";
            $stmt = $conn->prepare($sql);
            $stmt->bind_param("ii", $id, $empresa_id);
            $stmt->execute();
            $result = $stmt->get_result();
            $row = $result->fetch_assoc();

            if (!$row) {
                responderErro('Anexo não encontrado', 404);
            }
            responderSucesso('Anexo encontrado', $row);
        } elseif ($atendimento_id) {
            $sql = "
                SELECT ax.*
                FROM anexos ax
                INNER JOIN atendimentos a ON a.id = ax.atendimento_id
                WHERE ax.atendimento_id = ? AND a.empresa_id = ? AND ax.removido_em IS NULL
                ORDER BY ax.criado_em DESC
            ";
            $stmt = $conn->prepare($sql);
            $stmt->bind_param("ii", $atendimento_id, $empresa_id);
            $stmt->execute();
            $result = $stmt->get_result();
            $rows = $result->fetch_all(MYSQLI_ASSOC);
            responderSucesso('Anexos listados', $rows);
        } else {
            $sql = "
                SELECT ax.*, a.id AS atendimento_id
                FROM anexos ax
                INNER JOIN atendimentos a ON a.id = ax.atendimento_id AND a.empresa_id = ?
                WHERE ax.removido_em IS NULL
                ORDER BY ax.criado_em DESC
                LIMIT 200
            ";
            $stmt = $conn->prepare($sql);
            $stmt->bind_param("i", $empresa_id);
            $stmt->execute();
            $result = $stmt->get_result();
            $rows = $result->fetch_all(MYSQLI_ASSOC);
            responderSucesso('Últimos anexos', $rows);
        }
    } catch (Exception $e) {
        error_log("Erro ao buscar anexos: " . $e->getMessage());
        responderErro('Erro ao buscar anexos', 500);
    }
}

/**
 * POST -> upload de anexo
 * Payload: multipart/form-data com { file, atendimento_id, usuario_id }
 */
function handlePost($conn, $empresa_id)
{
    try {
        if (!isset($_POST['atendimento_id']) || !isset($_POST['usuario_id'])) {
            responderErro('atendimento_id e usuario_id são obrigatórios', 400);
        }

        $atendimento_id = (int)$_POST['atendimento_id'];
        $usuario_id = (int)$_POST['usuario_id'];

        // validar atendimento
        $stmt = $conn->prepare("SELECT id FROM atendimentos WHERE id = ? AND empresa_id = ? AND removido_em IS NULL");
        $stmt->bind_param("ii", $atendimento_id, $empresa_id);
        $stmt->execute();
        $result = $stmt->get_result();
        if (!$result->fetch_assoc()) {
            responderErro('Atendimento não encontrado ou não pertence à empresa', 404);
        }

        if (!isset($_FILES['file']) || $_FILES['file']['error'] !== UPLOAD_ERR_OK) {
            responderErro('Arquivo não enviado ou com erro', 400);
        }

        $file = $_FILES['file'];
        $maxSize = 10 * 1024 * 1024; // 10MB
        if ($file['size'] > $maxSize) {
            responderErro('Arquivo maior que 10MB', 400);
        }

        // validar extensão
        $allowedExt = ['jpg', 'jpeg', 'png', 'pdf', 'docx', 'xlsx', 'txt'];
        $ext = strtolower(pathinfo($file['name'], PATHINFO_EXTENSION));
        if (!in_array($ext, $allowedExt)) {
            responderErro('Tipo de arquivo não permitido', 400);
        }

        // diretório de upload
        $uploadDir = __DIR__ . "/../uploads/empresa_{$empresa_id}/atendimento_{$atendimento_id}/";
        if (!is_dir($uploadDir)) {
            mkdir($uploadDir, 0777, true);
        }

        $safeName = uniqid("ax_", true) . "." . $ext;
        $destPath = $uploadDir . $safeName;

        if (!move_uploaded_file($file['tmp_name'], $destPath)) {
            responderErro('Falha ao salvar arquivo', 500);
        }

        // registrar no banco
        $sql = "INSERT INTO anexos (atendimento_id, usuario_id, nome_arquivo, caminho, tamanho, criado_em) 
                VALUES (?, ?, ?, ?, ?, NOW())";
        $stmt = $conn->prepare($sql);
        $caminho = "uploads/empresa_{$empresa_id}/atendimento_{$atendimento_id}/" . $safeName;
        $stmt->bind_param("iisss",
            $atendimento_id,
            $usuario_id,
            $file['name'],
            $caminho,
            $file['size']
        );
        $stmt->execute();

        $newId = $conn->insert_id;

        responderSucesso('Arquivo enviado com sucesso', ['id' => $newId], 201);
    } catch (Exception $e) {
        error_log("Erro ao salvar anexo: " . $e->getMessage());
        responderErro('Erro ao salvar anexo', 500);
    }
}

/**
 * DELETE -> soft delete
 */
function handleDelete($conn, $empresa_id, $id)
{
    try {
        if (!$id) {
            responderErro('ID do anexo é obrigatório', 400);
        }

        $stmt = $conn->prepare("
            SELECT ax.id
            FROM anexos ax
            INNER JOIN atendimentos a ON a.id = ax.atendimento_id
            WHERE ax.id = ? AND a.empresa_id = ? AND ax.removido_em IS NULL
            LIMIT 1
        ");
        $stmt->bind_param("ii", $id, $empresa_id);
        $stmt->execute();
        $result = $stmt->get_result();
        if (!$result->fetch_assoc()) {
            responderErro('Anexo não encontrado', 404);
        }

        $d = $conn->prepare("UPDATE anexos SET removido_em = NOW() WHERE id = ?");
        $d->bind_param("i", $id);
        $d->execute();

        responderSucesso('Anexo excluído com sucesso');
    } catch (Exception $e) {
        error_log("Erro ao excluir anexo: " . $e->getMessage());
        responderErro('Erro ao excluir anexo', 500);
    }
}