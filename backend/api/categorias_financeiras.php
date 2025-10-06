<?php
/**
 * API de Categorias Financeiras
 * Gerenciamento de categorias de receitas e despesas
 */

require_once __DIR__ . "/../config/cors.php";
require_once __DIR__ . "/../config/db.php";

$metodo = $_SERVER["REQUEST_METHOD"];
$empresaId = obterEmpresaId();

if (!$empresaId) {
    responderErro("ID da empresa não fornecido", 400);
}

switch ($metodo) {
    case "GET":
        if (isset($_GET["id"])) {
            buscarCategoria($_GET["id"], $empresaId, $conn);
        } else {
            listarCategorias($empresaId, $conn);
        }
        break;

    case "POST":
        criarCategoria($empresaId, $conn);
        break;

    case "PUT":
        if (isset($_GET["id"])) {
            atualizarCategoria($_GET["id"], $empresaId, $conn);
        } else {
            responderErro("ID da categoria não fornecido", 400);
        }
        break;

    case "DELETE":
        if (isset($_GET["id"])) {
            excluirCategoria($_GET["id"], $empresaId, $conn);
        } else {
            responderErro("ID da categoria não fornecido", 400);
        }
        break;

    default:
        responderErro("Método não suportado", 405);
}

/**
 * Listar todas as categorias
 */
function listarCategorias($empresaId, $conn) {
    $sql = "SELECT * FROM categorias_financeiras 
            WHERE empresa_id = ? AND removido_em IS NULL 
            ORDER BY tipo ASC, nome ASC";
    
    $stmt = $conn->prepare($sql);
    $stmt->bind_param("i", $empresaId);
    $stmt->execute();
    $resultado = $stmt->get_result();
    
    $categorias = [];
    while ($row = $resultado->fetch_assoc()) {
        $categorias[] = $row;
    }
    
    responderSucesso("Categorias listadas com sucesso", $categorias);
}

/**
 * Buscar uma categoria específica
 */
function buscarCategoria($id, $empresaId, $conn) {
    $sql = "SELECT * FROM categorias_financeiras 
            WHERE id = ? AND empresa_id = ? AND removido_em IS NULL";
    
    $stmt = $conn->prepare($sql);
    $stmt->bind_param("ii", $id, $empresaId);
    $stmt->execute();
    $resultado = $stmt->get_result();
    
    if ($categoria = $resultado->fetch_assoc()) {
        responderSucesso("Categoria encontrada", $categoria);
    } else {
        responderErro("Categoria não encontrada", 404);
    }
}

/**
 * Criar nova categoria
 */
function criarCategoria($empresaId, $conn) {
    $dados = json_decode(file_get_contents("php://input"), true);
    
    // Validações
    if (empty($dados["nome"]) || empty($dados["tipo"])) {
        responderErro("Nome e tipo são obrigatórios", 400);
    }
    
    if (!in_array($dados["tipo"], ["receita", "despesa"])) {
        responderErro("Tipo inválido. Use 'receita' ou 'despesa'", 400);
    }
    
    $sql = "INSERT INTO categorias_financeiras (
                empresa_id, nome, tipo, categoria_pai_id, cor, icone, ativo
            ) VALUES (?, ?, ?, ?, ?, ?, ?)";
    
    $stmt = $conn->prepare($sql);
    $stmt->bind_param(
        "isssssi",
        $empresaId,
        $dados["nome"],
        $dados["tipo"],
        $dados["categoria_pai_id"] ?? null,
        $dados["cor"] ?? null,
        $dados["icone"] ?? null,
        $dados["ativo"] ?? 1
    );
    
    if ($stmt->execute()) {
        $novoId = $conn->insert_id;
        responderSucesso("Categoria criada com sucesso", ["id" => $novoId], 201);
    } else {
        responderErro("Erro ao criar categoria: " . $stmt->error, 500);
    }
}

/**
 * Atualizar categoria existente
 */
function atualizarCategoria($id, $empresaId, $conn) {
    $dados = json_decode(file_get_contents("php://input"), true);
    
    $sql = "UPDATE categorias_financeiras SET
                nome = ?,
                tipo = ?,
                categoria_pai_id = ?,
                cor = ?,
                icone = ?,
                ativo = ?
            WHERE id = ? AND empresa_id = ?";
    
    $stmt = $conn->prepare($sql);
    $stmt->bind_param(
        "ssisssii",
        $dados["nome"],
        $dados["tipo"],
        $dados["categoria_pai_id"] ?? null,
        $dados["cor"] ?? null,
        $dados["icone"] ?? null,
        $dados["ativo"] ?? 1,
        $id,
        $empresaId
    );
    
    if ($stmt->execute()) {
        responderSucesso("Categoria atualizada com sucesso");
    } else {
        responderErro("Erro ao atualizar categoria: " . $stmt->error, 500);
    }
}

/**
 * Excluir categoria (soft delete)
 */
function excluirCategoria($id, $empresaId, $conn) {
    // Verificar se existem lançamentos vinculados
    $sqlCheckPagar = "SELECT COUNT(*) as total FROM contas_pagar 
                      WHERE categoria_id = ? AND empresa_id = ? AND removido_em IS NULL";
    $stmtCheck = $conn->prepare($sqlCheckPagar);
    $stmtCheck->bind_param("ii", $id, $empresaId);
    $stmtCheck->execute();
    $totalPagar = $stmtCheck->get_result()->fetch_assoc()["total"];
    
    $sqlCheckReceber = "SELECT COUNT(*) as total FROM contas_receber 
                        WHERE categoria_id = ? AND empresa_id = ? AND removido_em IS NULL";
    $stmtCheck = $conn->prepare($sqlCheckReceber);
    $stmtCheck->bind_param("ii", $id, $empresaId);
    $stmtCheck->execute();
    $totalReceber = $stmtCheck->get_result()->fetch_assoc()["total"];
    
    if ($totalPagar > 0 || $totalReceber > 0) {
        responderErro("Não é possível excluir. Existem lançamentos vinculados a esta categoria.", 400);
    }
    
    $sql = "UPDATE categorias_financeiras SET removido_em = NOW() 
            WHERE id = ? AND empresa_id = ?";
    
    $stmt = $conn->prepare($sql);
    $stmt->bind_param("ii", $id, $empresaId);
    
    if ($stmt->execute() && $stmt->affected_rows > 0) {
        responderSucesso("Categoria excluída com sucesso");
    } else {
        responderErro("Categoria não encontrada", 404);
    }
}
?>
