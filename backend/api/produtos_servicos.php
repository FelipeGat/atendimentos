<?php
/**
 * API de Produtos e Serviços - Versão Convertida para PDO
 * Gerenciamento completo de produtos e serviços com controle de estoque
 */

// Habilitar exibição de erros para debug
ini_set('display_errors', 1);
ini_set('display_startup_errors', 1);
error_reporting(E_ALL);

// Definir modo de desenvolvimento
define('DEVELOPMENT_MODE', true);

require_once __DIR__ . "/../config/db.php";
require_once __DIR__ . "/../config/util.php";

// Inicialização da conexão
$conn = null;
try {
    $conn = getConnection(); // Usar PDO
    if (!$conn) {
        throw new Exception("Falha ao obter conexão com o banco de dados.");
    }

    $empresaId = obterEmpresaId();
    if (!$empresaId && DEVELOPMENT_MODE) {
        $empresaId = 1; // ID padrão para desenvolvimento
    }
    
    if (!$empresaId) {
        responderErro('ID da empresa não fornecido no cabeçalho X-Empresa-ID', 400);
    }

} catch (Exception $e) {
    error_log("Erro na inicialização da API de produtos e serviços: " . $e->getMessage());
    responderErro('Erro interno do servidor: ' . $e->getMessage(), 500);
}

// Definir cabeçalhos CORS
header("Content-Type: application/json; charset=UTF-8");
header("Access-Control-Allow-Origin: *"); // Em desenvolvimento, permitir todas as origens
header("Access-Control-Allow-Methods: GET, POST, PUT, DELETE, OPTIONS");
header("Access-Control-Allow-Headers: Content-Type, Authorization, X-Empresa-ID, X-Requested-With, X-HTTP-Method-Override");
header("Access-Control-Allow-Credentials: true");

// Tratar requisição OPTIONS (pré-flight CORS)
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit;
}

// Suporte a X-HTTP-Method-Override para requisições POST que deveriam ser PUT/DELETE
if ($_SERVER['REQUEST_METHOD'] === 'POST' && isset($_SERVER['HTTP_X_HTTP_METHOD_OVERRIDE'])) {
    $metodo = strtoupper($_SERVER['HTTP_X_HTTP_METHOD_OVERRIDE']);
} else {
    $metodo = $_SERVER['REQUEST_METHOD'];
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
    // Verificar se a tabela existe antes de tentar consultá-la
    try {
        $sql = "SELECT * FROM produtos_servicos_financeiro 
                WHERE empresa_id = ? AND removido_em IS NULL 
                ORDER BY codigo ASC";
        
        $stmt = $conn->prepare($sql);
        if (!$stmt) {
            responderErro("Erro na preparação da consulta", 500);
        }
        
        $stmt->execute([$empresaId]);
        $produtos = $stmt->fetchAll(PDO::FETCH_ASSOC);
        
        foreach ($produtos as &$row) {
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
        }
        
        responderSucesso("Produtos listados com sucesso", $produtos);
    } catch (PDOException $e) {
        // Verificar se o erro é devido à tabela não existir
        if (strpos($e->getMessage(), 'Table') !== false && strpos($e->getMessage(), 'doesn\'t exist') !== false) {
            responderErro("A tabela de produtos e serviços não está configurada no banco de dados", 500);
        } else {
            responderErro("Erro ao acessar os dados: " . $e->getMessage(), 500);
        }
    }
}

/**
 * Buscar um produto específico
 */
function buscarProduto($id, $empresaId, $conn) {
    try {
        $sql = "SELECT * FROM produtos_servicos_financeiro 
                WHERE id = ? AND empresa_id = ? AND removido_em IS NULL";
        
        $stmt = $conn->prepare($sql);
        if (!$stmt) {
            responderErro("Erro na preparação da consulta", 500);
        }
        
        $stmt->execute([$id, $empresaId]);
        $produto = $stmt->fetch(PDO::FETCH_ASSOC);
        
        if ($produto) {
            responderSucesso("Produto encontrado", $produto);
        } else {
            responderErro("Produto não encontrado", 404);
        }
    } catch (PDOException $e) {
        // Verificar se o erro é devido à tabela não existir
        if (strpos($e->getMessage(), 'Table') !== false && strpos($e->getMessage(), 'doesn\'t exist') !== false) {
            responderErro("A tabela de produtos e serviços não está configurada no banco de dados", 500);
        } else {
            responderErro("Erro ao acessar os dados: " . $e->getMessage(), 500);
        }
    }
}

/**
 * Criar novo produto/serviço
 */
function criarProduto($empresaId, $conn) {
    try {
        // Detectar se os dados estão vindo como FormData (via $_POST) ou JSON (via php://input)
        if (!empty($_POST)) {
            // Dados vindo como FormData via POST
            $dados = $_POST;
        } else {
            // Dados vindo como JSON via php://input
            $dados = json_decode(file_get_contents("php://input"), true);
        }
        
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
            if (!$stmtMax) {
                responderErro("Erro na preparação da consulta para obter código", 500);
            }
            $stmtMax->execute([$empresaId]);
            $resultMax = $stmtMax->fetch(PDO::FETCH_ASSOC);
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
        if (!$stmt) {
            responderErro("Erro na preparação da consulta de inserção", 500);
        }
        
        $params = [
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
        ];
        
        if ($stmt->execute($params)) {
            $novoId = $conn->lastInsertId();
            responderSucesso("Produto criado com sucesso", ["id" => $novoId, "codigo" => $dados["codigo"]], 201);
        } else {
            responderErro("Erro ao criar produto", 500);
        }
    } catch (PDOException $e) {
        // Verificar se o erro é devido à tabela não existir
        if (strpos($e->getMessage(), 'Table') !== false && strpos($e->getMessage(), 'doesn\'t exist') !== false) {
            responderErro("A tabela de produtos e serviços não está configurada no banco de dados", 500);
        } else {
            responderErro("Erro ao criar produto: " . $e->getMessage(), 500);
        }
    }
}

/**
 * Atualizar produto/serviço
 */
function atualizarProduto($id, $empresaId, $conn) {
    try {
        // Detectar se os dados estão vindo como FormData (via $_POST) ou JSON (via php://input)
        if (!empty($_POST)) {
            // Dados vindo como FormData via POST
            $dados = $_POST;
        } else {
            // Dados vindo como JSON via php://input
            $dados = json_decode(file_get_contents("php://input"), true);
        }
        
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
        if (!$stmt) {
            responderErro("Erro na preparação da consulta de atualização", 500);
        }
        
        $params = [
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
        ];
        
        if ($stmt->execute($params)) {
            responderSucesso("Produto atualizado com sucesso");
        } else {
            responderErro("Erro ao atualizar produto", 500);
        }
    } catch (PDOException $e) {
        // Verificar se o erro é devido à tabela não existir
        if (strpos($e->getMessage(), 'Table') !== false && strpos($e->getMessage(), 'doesn\'t exist') !== false) {
            responderErro("A tabela de produtos e serviços não está configurada no banco de dados", 500);
        } else {
            responderErro("Erro ao atualizar produto: " . $e->getMessage(), 500);
        }
    }
}

/**
 * Excluir produto/serviço (soft delete)
 */
function excluirProduto($id, $empresaId, $conn) {
    try {
        $sql = "UPDATE produtos_servicos_financeiro SET removido_em = NOW() 
                WHERE id = ? AND empresa_id = ?";
        
        $stmt = $conn->prepare($sql);
        if (!$stmt) {
            responderErro("Erro na preparação da consulta de exclusão", 500);
        }
        
        $result = $stmt->execute([$id, $empresaId]);
        
        if ($result && $stmt->rowCount() > 0) {
            responderSucesso("Produto excluído com sucesso");
        } else {
            responderErro("Produto não encontrado", 404);
        }
    } catch (PDOException $e) {
        // Verificar se o erro é devido à tabela não existir
        if (strpos($e->getMessage(), 'Table') !== false && strpos($e->getMessage(), 'doesn\'t exist') !== false) {
            responderErro("A tabela de produtos e serviços não está configurada no banco de dados", 500);
        } else {
            responderErro("Erro ao excluir produto: " . $e->getMessage(), 500);
        }
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
