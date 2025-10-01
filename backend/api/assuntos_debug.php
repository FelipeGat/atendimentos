<?php
/**
 * VERSÃO DE DEBUG - NÃO USAR EM PRODUÇÃO FINAL
 * Use temporariamente para diagnosticar o problema
 */

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

// MODO DEBUG - Capturar informações
$debug_info = [
    "metodo" => $metodo,
    "timestamp" => date('Y-m-d H:i:s'),
    "headers" => getallheaders(),
    "get_params" => $_GET,
    "post_raw" => file_get_contents("php://input"),
    "ambiente" => isset($isProduction) ? ($isProduction ? "Produção" : "Desenvolvimento") : "Desconhecido",
    "banco" => isset($banco) ? $banco : "Desconhecido"
];

switch ($metodo) {
    case 'GET':
        // Verificar estrutura da tabela
        $check_table = $conn->query("SHOW TABLES LIKE 'assuntos'");
        $debug_info["tabela_existe"] = $check_table && $check_table->num_rows > 0;
        
        if (!$debug_info["tabela_existe"]) {
            responderErro("Tabela 'assuntos' não encontrada no banco de dados!", 500);
        }
        
        // Verificar se a coluna removido_em existe (soft delete)
        $check_column = $conn->query("SHOW COLUMNS FROM assuntos LIKE 'removido_em'");
        $has_soft_delete = $check_column && $check_column->num_rows > 0;
        $debug_info["soft_delete_ativo"] = $has_soft_delete;
        
        // Verificar colunas da tabela
        $columns = $conn->query("SHOW COLUMNS FROM assuntos");
        $debug_info["colunas"] = [];
        while ($col = $columns->fetch_assoc()) {
            $debug_info["colunas"][] = $col['Field'];
        }
        
        // Construir SQL com ou sem filtro de soft delete
        if ($has_soft_delete) {
            $sql = "SELECT id, nome, criado_em FROM assuntos WHERE removido_em IS NULL ORDER BY nome ASC";
        } else {
            $sql = "SELECT id, nome, criado_em FROM assuntos ORDER BY nome ASC";
        }
        
        $debug_info["sql_executado"] = $sql;
        
        $resultado = $conn->query($sql);

        if (!$resultado) {
            $debug_info["erro_mysql"] = $conn->error;
            http_response_code(500);
            echo json_encode([
                "success" => false,
                "message" => "Erro ao buscar assuntos: " . $conn->error,
                "debug" => $debug_info
            ], JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE);
            exit;
        }

        $dados = [];
        while ($row = $resultado->fetch_assoc()) {
            $dados[] = $row;
        }
        
        $debug_info["total_registros"] = count($dados);
        
        // Contar total sem filtro
        $total_sem_filtro = $conn->query("SELECT COUNT(*) as total FROM assuntos");
        $debug_info["total_sem_filtro"] = $total_sem_filtro ? $total_sem_filtro->fetch_assoc()['total'] : 0;
        
        if ($has_soft_delete) {
            $total_removidos = $conn->query("SELECT COUNT(*) as total FROM assuntos WHERE removido_em IS NOT NULL");
            $debug_info["total_removidos"] = $total_removidos ? $total_removidos->fetch_assoc()['total'] : 0;
        }

        http_response_code(200);
        echo json_encode([
            "success" => true,
            "message" => "Assuntos listados com sucesso.",
            "data" => $dados,
            "debug" => $debug_info
        ], JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE);
        break;

    case 'POST':
        $dados = json_decode(file_get_contents("php://input"), true);
        $debug_info["dados_recebidos"] = $dados;

        if (!isset($dados['nome']) || empty(trim($dados['nome']))) {
            http_response_code(400);
            echo json_encode([
                "success" => false,
                "message" => "O campo 'nome' é obrigatório.",
                "debug" => $debug_info
            ], JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE);
            exit;
        }

        $stmt = $conn->prepare("INSERT INTO assuntos (nome) VALUES (?)");
        $stmt->bind_param("s", $dados['nome']);

        if ($stmt->execute()) {
            $id_inserido = $stmt->insert_id;
            $debug_info["id_inserido"] = $id_inserido;
            
            // Buscar o assunto recém-criado para retornar os dados completos
            $stmt_select = $conn->prepare("SELECT id, nome, criado_em FROM assuntos WHERE id = ?");
            $stmt_select->bind_param("i", $id_inserido);
            $stmt_select->execute();
            $resultado = $stmt_select->get_result();
            $assunto_criado = $resultado->fetch_assoc();
            $stmt_select->close();
            
            $debug_info["assunto_criado"] = $assunto_criado;
            
            http_response_code(200);
            echo json_encode([
                "success" => true,
                "message" => "Assunto cadastrado com sucesso.",
                "data" => $assunto_criado,
                "debug" => $debug_info
            ], JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE);
        } else {
            $debug_info["erro_mysql"] = $stmt->error;
            http_response_code(500);
            echo json_encode([
                "success" => false,
                "message" => "Erro ao cadastrar assunto: " . $stmt->error,
                "debug" => $debug_info
            ], JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE);
        }

        $stmt->close();
        break;

    default:
        http_response_code(405);
        echo json_encode([
            "success" => false,
            "message" => "Método não permitido.",
            "debug" => $debug_info
        ], JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE);
}
?>
