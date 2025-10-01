<?php
require_once __DIR__ . "/../config/db.php";
require_once __DIR__ . "/../config/util.php";

// Definir cabeçalhos
header("Content-Type: application/json; charset=UTF-8");
header("Access-Control-Allow-Origin: *");
header("Access-Control-Allow-Methods: GET, POST, PUT, DELETE, OPTIONS");
header("Access-Control-Allow-Headers: Content-Type, Authorization, X-Empresa-ID");

// Tratar requisição OPTIONS (pré-flight CORS)
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit;
}

$metodo = $_SERVER['REQUEST_METHOD'];

switch ($metodo) {
    case 'GET':
        // Tentar primeiro com soft delete, se falhar, sem filtro
        $sql = "SELECT id, nome, criado_em FROM assuntos WHERE (removido_em IS NULL OR removido_em = '') ORDER BY nome ASC";
        $resultado = $conn->query($sql);
        
        // Se der erro (coluna não existe), tentar sem o filtro
        if (!$resultado) {
            $sql = "SELECT id, nome, criado_em FROM assuntos ORDER BY nome ASC";
            $resultado = $conn->query($sql);
        }

        if (!$resultado) {
            responderErro("Erro ao buscar assuntos: " . $conn->error, 500);
        }

        $dados = [];
        while ($row = $resultado->fetch_assoc()) {
            $dados[] = $row;
        }

        responderSucesso("Assuntos listados com sucesso.", $dados);
        break;

    case 'POST':
        $dados = json_decode(file_get_contents("php://input"), true);

        if (!isset($dados['nome']) || empty(trim($dados['nome']))) {
            responderErro("O campo 'nome' é obrigatório.", 400);
        }

        $stmt = $conn->prepare("INSERT INTO assuntos (nome) VALUES (?)");
        $stmt->bind_param("s", $dados['nome']);

        if ($stmt->execute()) {
            $id_inserido = $stmt->insert_id;
            
            // Buscar o assunto recém-criado para retornar os dados completos
            $stmt_select = $conn->prepare("SELECT id, nome, criado_em FROM assuntos WHERE id = ?");
            $stmt_select->bind_param("i", $id_inserido);
            $stmt_select->execute();
            $resultado = $stmt_select->get_result();
            $assunto_criado = $resultado->fetch_assoc();
            $stmt_select->close();
            
            responderSucesso("Assunto cadastrado com sucesso.", $assunto_criado);
        } else {
            responderErro("Erro ao cadastrar assunto: " . $stmt->error, 500);
        }

        $stmt->close();
        break;

    case 'PUT':
        $dados = json_decode(file_get_contents("php://input"), true);

        if (!isset($dados['id']) || !isset($dados['nome'])) {
            responderErro("Campos obrigatórios: id, nome.", 400);
        }

        $stmt = $conn->prepare("UPDATE assuntos SET nome = ? WHERE id = ?");
        $stmt->bind_param("si", $dados['nome'], $dados['id']);

        if ($stmt->execute()) {
            responderSucesso("Assunto atualizado com sucesso.");
        } else {
            responderErro("Erro ao atualizar assunto: " . $stmt->error, 500);
        }

        $stmt->close();
        break;

    case 'DELETE':
    $id = $_GET['id'] ?? null;

    if (!$id) {
        responderErro("Campo obrigatório: id.", 400);
    }

    // Tentar soft delete primeiro, se falhar, hard delete
    $stmt = $conn->prepare("UPDATE assuntos SET removido_em = NOW() WHERE id = ?");
    $stmt->bind_param("i", $id);
    
    // Se UPDATE falhar (coluna não existe), fazer DELETE
    if (!$stmt->execute() || $stmt->affected_rows === 0) {
        $stmt->close();
        $stmt = $conn->prepare("DELETE FROM assuntos WHERE id = ?");
        $stmt->bind_param("i", $id);
        $stmt->execute();
    }

    if ($stmt->affected_rows > 0 || $conn->affected_rows > 0) {
        responderSucesso("Assunto excluído com sucesso.");
    } else {
        responderErro("Erro ao excluir assunto ou assunto não encontrado.", 500);
    }

    $stmt->close();
    break;

    default:
        responderErro("Método não permitido.", 405);
}
?>