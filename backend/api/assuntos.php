<?php
// Definir headers imediatamente para garantir o tipo de conteúdo correto
header("Content-Type: application/json; charset=UTF-8", true);
header("Access-Control-Allow-Origin: *", false);
header("Access-Control-Allow-Methods: GET, POST, PUT, DELETE, OPTIONS", false);
header("Access-Control-Allow-Headers: Content-Type, Authorization", false);
header("Cache-Control: no-cache, no-store, must-revalidate", false);
header("Pragma: no-cache", false);
header("Expires: 0", false);

// Habilitar relatório de erros para debugging em produção
error_reporting(E_ALL);
ini_set('display_errors', 1);
ini_set('log_errors', 1);

// Função de logging personalizada para garantir que os logs sejam criados
function logAtividade($mensagem) {
    $timestamp = date('Y-m-d H:i:s');
    $log_message = "[$timestamp] $mensagem" . PHP_EOL;
    file_put_contents(__DIR__ . '/logs_assuntos.txt', $log_message, FILE_APPEND | LOCK_EX);
}

// Registrar logs em um arquivo mais acessível
logAtividade("Script iniciado - " . $_SERVER['REQUEST_METHOD']);

// Tratar requisição OPTIONS (pré-flight CORS)
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit;
}

require_once __DIR__ . "/../config/db.php";
require_once __DIR__ . "/../config/util.php";

$metodo = $_SERVER['REQUEST_METHOD'];

// Log de debug usando nossa função personalizada
logAtividade("Método recebido: " . $metodo);
logAtividade("Dados recebidos: " . file_get_contents("php://input"));

switch ($metodo) {
    case 'GET':
        logAtividade("Iniciando operação GET");
        $sql = "SELECT id, nome, criado_em FROM assuntos ORDER BY nome ASC";
        $resultado = $conn->query($sql);

        if (!$resultado) {
            logAtividade("Erro na query GET: " . $conn->error);
            responderErro("Erro ao buscar assuntos: " . $conn->error, 500);
        }

        $dados = [];
        $count = 0;
        while ($row = $resultado->fetch_assoc()) {
            $dados[] = $row;
            logAtividade("Assunto encontrado: ID=" . $row['id'] . ", Nome=" . $row['nome']);
            $count++;
        }
        logAtividade("Total de assuntos encontrados: " . $count);

        responderSucesso("Assuntos listados com sucesso.", $dados);
        break;

    case 'POST':
        logAtividade("Iniciando operação POST");
        $dados = json_decode(file_get_contents("php://input"), true);

        if (!isset($dados['nome']) || empty(trim($dados['nome']))) {
            responderErro("O campo 'nome' é obrigatório.", 400);
        }

        logAtividade("Tentando inserir assunto: " . $dados['nome']);
        $stmt = $conn->prepare("INSERT INTO assuntos (nome) VALUES (?)");
        $stmt->bind_param("s", $dados['nome']);

        if ($stmt->execute()) {
            $novo_id = $conn->insert_id;
            logAtividade("Assunto inserido com sucesso. ID: " . $novo_id);
            
            $novo_assunto = [
                'id' => $novo_id,
                'nome' => $dados['nome'],
                'criado_em' => date('Y-m-d H:i:s')
            ];
            responderSucesso("Assunto cadastrado com sucesso.", $novo_assunto);
        } else {
            logAtividade("Erro na query POST: " . $stmt->error);
            responderErro("Erro ao cadastrar assunto: " . $stmt->error, 500);
        }

        $stmt->close();
        break;

    case 'PUT':
        logAtividade("Iniciando operação PUT");
        $dados = json_decode(file_get_contents("php://input"), true);

        if (!isset($dados['id']) || !isset($dados['nome'])) {
            responderErro("Campos obrigatórios: id, nome.", 400);
        }

        logAtividade("Tentando atualizar assunto ID: " . $dados['id'] . " com nome: " . $dados['nome']);
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
                
                logAtividade("Assunto atualizado: ID=" . $assunto_atualizado['id'] . ", Nome=" . $assunto_atualizado['nome']);
                responderSucesso("Assunto atualizado com sucesso.", $assunto_atualizado);
            } else {
                logAtividade("Nenhum assunto encontrado com ID: " . $dados['id']);
                responderErro("Nenhum assunto encontrado com o ID fornecido.", 404);
            }
        } else {
            logAtividade("Erro na query PUT: " . $stmt->error);
            responderErro("Erro ao atualizar assunto: " . $stmt->error, 500);
        }

        $stmt->close();
        break;

    case 'DELETE':
        logAtividade("Iniciando operação DELETE");
        $id = $_GET['id'] ?? null;

        if (!$id) {
            responderErro("Campo obrigatório: id.", 400);
        }

        logAtividade("Tentando excluir assunto ID: " . $id);
        $stmt = $conn->prepare("DELETE FROM assuntos WHERE id = ?");
        $stmt->bind_param("i", $id);

        if ($stmt->execute()) {
            if ($stmt->affected_rows > 0) {
                logAtividade("Assunto excluído com sucesso. ID: " . $id);
                responderSucesso("Assunto excluído com sucesso.");
            } else {
                logAtividade("Nenhum assunto encontrado com ID: " . $id . " para exclusão");
                responderErro("Nenhum assunto encontrado com o ID fornecido.", 404);
            }
        } else {
            logAtividade("Erro na query DELETE: " . $stmt->error);
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