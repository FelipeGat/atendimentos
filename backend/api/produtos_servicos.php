<?php
/**
 * API de Produtos e Serviços
 * Gerenciamento completo de produtos e serviços com controle de estoque
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
            buscarProduto($_GET["id"], $empresaId, $conn);
        } elseif (isset($_GET["action"]) && $_GET["action"] === "gerar_codigo_barras") {
            gerarCodigoBarras();
        } else {
            listarProdutos($empresaId, $conn);
        }
        break;

    case "POST":
        criarProduto($empresaId, $conn);
        break;

    case "PUT":
        if (isset($_GET["id"])) {
            atualizarProduto($_GET["id"], $empresaId, $conn);
        } else {
            responderErro("ID do produto não fornecido", 400);
        }
        break;

    case "DELETE":
        if (isset($_GET["id"])) {
            excluirProduto($_GET["id"], $empresaId, $conn);
        } else {
            responderErro("ID do produto não fornecido", 400);
        }
        break;

    default:
        responderErro("Método não suportado", 405);
}

/**
 * Listar todos os produtos/serviços
 */
function listarProdutos($empresaId, $conn) {
    $sql = "SELECT * FROM produtos_servicos_financeiro 
            WHERE empresa_id = ? AND removido_em IS NULL 
            ORDER BY codigo ASC";
    
    $stmt = $conn->prepare($sql);
    $stmt->bind_param("i", $empresaId);
    $stmt->execute();
    $resultado = $stmt->get_result();
    
    $produtos = [];
    while ($row = $resultado->fetch_assoc()) {
        // Calcular preço baseado no custo e margem
        if ($row["custo"] && $row["margem"]) {
            $row["preco_calculado"] = $row["custo"] * (1 + ($row["margem"] / 100));
        } else {
            $row["preco_calculado"] = $row["preco"];
        }
        
        // Verificar estoque baixo
        if ($row["tipo"] === "produto" && $row["estoque_atual"] <= $row["estoque_minimo"]) {
            $row["estoque_baixo"] = true;
        } else {
            $row["estoque_baixo"] = false;
        }
        
        $produtos[] = $row;
    }
    
    responderSucesso("Produtos listados com sucesso", $produtos);
}

/**
 * Buscar um produto específico
 */
function buscarProduto($id, $empresaId, $conn) {
    $sql = "SELECT * FROM produtos_servicos_financeiro 
            WHERE id = ? AND empresa_id = ? AND removido_em IS NULL";
    
    $stmt = $conn->prepare($sql);
    $stmt->bind_param("ii", $id, $empresaId);
    $stmt->execute();
    $resultado = $stmt->get_result();
    
    if ($produto = $resultado->fetch_assoc()) {
        responderSucesso("Produto encontrado", $produto);
    } else {
        responderErro("Produto não encontrado", 404);
    }
}

/**
 * Criar novo produto/serviço
 */
function criarProduto($empresaId, $conn) {
    $dados = json_decode(file_get_contents("php://input"), true);
    
    // Validações
    if (empty($dados["nome"])) {
        responderErro("Nome é obrigatório", 400);
    }
    
    if (empty($dados["tipo"])) {
        responderErro("Tipo é obrigatório", 400);
    }
    
    // Gerar código sequencial se não fornecido
    if (empty($dados["codigo"])) {
        $sqlMaxCodigo = "SELECT MAX(CAST(codigo AS UNSIGNED)) as max_codigo 
                         FROM produtos_servicos_financeiro 
                         WHERE empresa_id = ?";
        $stmtMax = $conn->prepare($sqlMaxCodigo);
        $stmtMax->bind_param("i", $empresaId);
        $stmtMax->execute();
        $resultMax = $stmtMax->get_result()->fetch_assoc();
        $dados["codigo"] = ($resultMax["max_codigo"] ?? 0) + 1;
    }
    
    // Gerar código de barras interno se não fornecido
    if (empty($dados["codigo_barras"])) {
        $dados["codigo_barras"] = "INT" . str_pad($empresaId, 3, "0", STR_PAD_LEFT) . 
                                   str_pad($dados["codigo"], 9, "0", STR_PAD_LEFT);
    }
    
    // Calcular preço baseado em custo e margem
    if (!empty($dados["custo"]) && !empty($dados["margem"])) {
        $dados["preco"] = $dados["custo"] * (1 + ($dados["margem"] / 100));
    }
    
    $sql = "INSERT INTO produtos_servicos_financeiro (
                empresa_id, codigo, codigo_barras, finalidade, nome, tipo, tipo_unidade,
                estoque_minimo, estoque_atual, custo, margem, preco, observacoes,
                ncm, peso_liquido, peso_bruto, cest, beneficio_fiscal, ativo
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)";
    
    $stmt = $conn->prepare($sql);
    $stmt->bind_param(
        "issssssdddddssddssi",
        $empresaId,
        $dados["codigo"],
        $dados["codigo_barras"],
        $dados["finalidade"] ?? "venda",
        $dados["nome"],
        $dados["tipo"],
        $dados["tipo_unidade"] ?? "UN",
        $dados["estoque_minimo"] ?? 0,
        $dados["estoque_atual"] ?? 0,
        $dados["custo"] ?? 0,
        $dados["margem"] ?? 0,
        $dados["preco"] ?? 0,
        $dados["observacoes"] ?? null,
        $dados["ncm"] ?? null,
        $dados["peso_liquido"] ?? null,
        $dados["peso_bruto"] ?? null,
        $dados["cest"] ?? null,
        $dados["beneficio_fiscal"] ?? null,
        $dados["ativo"] ?? 1
    );
    
    if ($stmt->execute()) {
        $novoId = $conn->insert_id;
        responderSucesso("Produto criado com sucesso", ["id" => $novoId, "codigo" => $dados["codigo"]], 201);
    } else {
        responderErro("Erro ao criar produto: " . $stmt->error, 500);
    }
}

/**
 * Atualizar produto/serviço
 */
function atualizarProduto($id, $empresaId, $conn) {
    $dados = json_decode(file_get_contents("php://input"), true);
    
    // Calcular preço baseado em custo e margem
    if (!empty($dados["custo"]) && !empty($dados["margem"])) {
        $dados["preco"] = $dados["custo"] * (1 + ($dados["margem"] / 100));
    }
    
    $sql = "UPDATE produtos_servicos_financeiro SET
                codigo = ?,
                codigo_barras = ?,
                finalidade = ?,
                nome = ?,
                tipo = ?,
                tipo_unidade = ?,
                estoque_minimo = ?,
                estoque_atual = ?,
                custo = ?,
                margem = ?,
                preco = ?,
                observacoes = ?,
                ncm = ?,
                peso_liquido = ?,
                peso_bruto = ?,
                cest = ?,
                beneficio_fiscal = ?,
                ativo = ?
            WHERE id = ? AND empresa_id = ?";
    
    $stmt = $conn->prepare($sql);
    $stmt->bind_param(
        "ssssssdddddssddssiii",
        $dados["codigo"],
        $dados["codigo_barras"],
        $dados["finalidade"],
        $dados["nome"],
        $dados["tipo"],
        $dados["tipo_unidade"],
        $dados["estoque_minimo"],
        $dados["estoque_atual"],
        $dados["custo"],
        $dados["margem"],
        $dados["preco"],
        $dados["observacoes"] ?? null,
        $dados["ncm"] ?? null,
        $dados["peso_liquido"] ?? null,
        $dados["peso_bruto"] ?? null,
        $dados["cest"] ?? null,
        $dados["beneficio_fiscal"] ?? null,
        $dados["ativo"] ?? 1,
        $id,
        $empresaId
    );
    
    if ($stmt->execute()) {
        responderSucesso("Produto atualizado com sucesso");
    } else {
        responderErro("Erro ao atualizar produto: " . $stmt->error, 500);
    }
}

/**
 * Excluir produto/serviço (soft delete)
 */
function excluirProduto($id, $empresaId, $conn) {
    $sql = "UPDATE produtos_servicos_financeiro SET removido_em = NOW() 
            WHERE id = ? AND empresa_id = ?";
    
    $stmt = $conn->prepare($sql);
    $stmt->bind_param("ii", $id, $empresaId);
    
    if ($stmt->execute() && $stmt->affected_rows > 0) {
        responderSucesso("Produto excluído com sucesso");
    } else {
        responderErro("Produto não encontrado", 404);
    }
}

/**
 * Gerar código de barras aleatório
 */
function gerarCodigoBarras() {
    $codigoBarras = "INT" . str_pad(rand(1, 999), 3, "0", STR_PAD_LEFT) . 
                    str_pad(rand(1, 999999999), 9, "0", STR_PAD_LEFT);
    
    responderSucesso("Código de barras gerado", ["codigo_barras" => $codigoBarras]);
}
?>
