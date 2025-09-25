<?php
require_once __DIR__ . "/../config/db.php";
require_once __DIR__ . "/../config/util.php";

// Definir cabeçalhos
header("Content-Type: application/json; charset=UTF-8");
header("Access-Control-Allow-Origin: *");
header("Access-Control-Allow-Methods: GET, POST, PUT, DELETE, OPTIONS");
header("Access-Control-Allow-Headers: Content-Type, Authorization");

// Tratar requisição OPTIONS (pré-flight CORS)
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit;
}

$metodo = $_SERVER['REQUEST_METHOD'];

switch ($metodo) {
    case 'GET':
        $sql = "SELECT id, nome, criado_em FROM assuntos ORDER BY nome ASC";
        $resultado = $conn->query($sql);

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
            // Retornar resposta no formato consistente com as outras APIs
            $novo_id = $conn->insert_id;
            $novo_assunto = [
                'id' => $novo_id,
                'nome' => $dados['nome'],
                'criado_em' => date('Y-m-d H:i:s')
            ];
            responderSucesso("Assunto cadastrado com sucesso.", $novo_assunto);
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
            if ($stmt->affected_rows > 0) {
                // Retornar o assunto atualizado
                $sql = "SELECT id, nome, criado_em FROM assuntos WHERE id = ?";
                $stmt_select = $conn->prepare($sql);
                $stmt_select->bind_param("i", $dados['id']);
                $stmt_select->execute();
                $resultado = $stmt_select->get_result();
                $assunto_atualizado = $resultado->fetch_assoc();
                
                responderSucesso("Assunto atualizado com sucesso.", $assunto_atualizado);
            } else {
                responderErro("Nenhum assunto encontrado com o ID fornecido.", 404);
            }
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

        $stmt = $conn->prepare("DELETE FROM assuntos WHERE id = ?");
        $stmt->bind_param("i", $id);

        if ($stmt->execute()) {
            if ($stmt->affected_rows > 0) {
                responderSucesso("Assunto excluído com sucesso.");
            } else {
                responderErro("Nenhum assunto encontrado com o ID fornecido.", 404);
            }
        } else {
            responderErro("Erro ao excluir assunto: " . $stmt->error, 500);
        }

        $stmt->close();
        break;

    default:
        responderErro("Método não permitido.", 405);
}

// Fechar conexão
$conn->close();
?>