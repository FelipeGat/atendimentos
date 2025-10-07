<?php
/**
 * API de Fornecedores
 * Gerenciamento de fornecedores do módulo financeiro
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
            buscarFornecedor($_GET["id"], $empresaId, $conn);
        } else {
            listarFornecedores($empresaId, $conn);
        }
        break;

    case "POST":
        criarFornecedor($empresaId, $conn);
        break;

    case "PUT":
        if (isset($_GET["id"])) {
            atualizarFornecedor($_GET["id"], $empresaId, $conn);
        } else {
            responderErro("ID do fornecedor não fornecido", 400);
        }
        break;

    case "DELETE":
        if (isset($_GET["id"])) {
            excluirFornecedor($_GET["id"], $empresaId, $conn);
        } else {
            responderErro("ID do fornecedor não fornecido", 400);
        }
        break;

    default:
        responderErro("Método não suportado", 405);
}

/**
 * Listar todos os fornecedores da empresa
 */
function listarFornecedores($empresaId, $conn) {
    $sql = "SELECT * FROM fornecedores 
            WHERE empresa_id = ? AND removido_em IS NULL 
            ORDER BY nome ASC";
    
    $stmt = $conn->prepare($sql);
    $stmt->bind_param("i", $empresaId);
    $stmt->execute();
    $resultado = $stmt->get_result();
    
    $fornecedores = [];
    while ($row = $resultado->fetch_assoc()) {
        $fornecedores[] = $row;
    }
    
    responderSucesso("Fornecedores listados com sucesso", $fornecedores);
}

/**
 * Buscar um fornecedor específico
 */
function buscarFornecedor($id, $empresaId, $conn) {
    $sql = "SELECT * FROM fornecedores 
            WHERE id = ? AND empresa_id = ? AND removido_em IS NULL";
    
    $stmt = $conn->prepare($sql);
    $stmt->bind_param("ii", $id, $empresaId);
    $stmt->execute();
    $resultado = $stmt->get_result();
    
    if ($fornecedor = $resultado->fetch_assoc()) {
        responderSucesso("Fornecedor encontrado", $fornecedor);
    } else {
        responderErro("Fornecedor não encontrado", 404);
    }
}

/**
 * Criar novo fornecedor
 */
function criarFornecedor($empresaId, $conn) {
    $dados = json_decode(file_get_contents("php://input"), true);
    
    // Validações
    if (empty($dados["nome"])) {
        responderErro("Nome do fornecedor é obrigatório", 400);
    }
    
    $sql = "INSERT INTO fornecedores (
                empresa_id, nome, razao_social, cnpj_cpf, email, telefone, celular,
                cep, logradouro, numero, complemento, bairro, cidade, estado,
                observacoes, ativo
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)";
    
    $stmt = $conn->prepare($sql);
    $stmt->bind_param(
        "issssssssssssssi",
        $empresaId,
        $dados["nome"],
        $dados["razao_social"] ?? null,
        $dados["cnpj_cpf"] ?? null,
        $dados["email"] ?? null,
        $dados["telefone"] ?? null,
        $dados["celular"] ?? null,
        $dados["cep"] ?? null,
        $dados["logradouro"] ?? null,
        $dados["numero"] ?? null,
        $dados["complemento"] ?? null,
        $dados["bairro"] ?? null,
        $dados["cidade"] ?? null,
        $dados["estado"] ?? null,
        $dados["observacoes"] ?? null,
        $dados["ativo"] ?? 1
    );
    
    if ($stmt->execute()) {
        $novoId = $conn->insert_id;
        responderSucesso("Fornecedor criado com sucesso", ["id" => $novoId], 201);
    } else {
        responderErro("Erro ao criar fornecedor: " . $stmt->error, 500);
    }
}

/**
 * Atualizar fornecedor existente
 */
function atualizarFornecedor($id, $empresaId, $conn) {
    $dados = json_decode(file_get_contents("php://input"), true);
    
    // Verificar se o fornecedor existe e pertence à empresa
    $sqlCheck = "SELECT id FROM fornecedores WHERE id = ? AND empresa_id = ? AND removido_em IS NULL";
    $stmtCheck = $conn->prepare($sqlCheck);
    $stmtCheck->bind_param("ii", $id, $empresaId);
    $stmtCheck->execute();
    
    if ($stmtCheck->get_result()->num_rows === 0) {
        responderErro("Fornecedor não encontrado", 404);
    }
    
    $sql = "UPDATE fornecedores SET
                nome = ?,
                razao_social = ?,
                cnpj_cpf = ?,
                email = ?,
                telefone = ?,
                celular = ?,
                cep = ?,
                logradouro = ?,
                numero = ?,
                complemento = ?,
                bairro = ?,
                cidade = ?,
                estado = ?,
                observacoes = ?,
                ativo = ?
            WHERE id = ? AND empresa_id = ?";
    
    $stmt = $conn->prepare($sql);
    $stmt->bind_param(
        "ssssssssssssssiis",
        $dados["nome"],
        $dados["razao_social"] ?? null,
        $dados["cnpj_cpf"] ?? null,
        $dados["email"] ?? null,
        $dados["telefone"] ?? null,
        $dados["celular"] ?? null,
        $dados["cep"] ?? null,
        $dados["logradouro"] ?? null,
        $dados["numero"] ?? null,
        $dados["complemento"] ?? null,
        $dados["bairro"] ?? null,
        $dados["cidade"] ?? null,
        $dados["estado"] ?? null,
        $dados["observacoes"] ?? null,
        $dados["ativo"] ?? 1,
        $id,
        $empresaId
    );
    
    if ($stmt->execute()) {
        responderSucesso("Fornecedor atualizado com sucesso");
    } else {
        responderErro("Erro ao atualizar fornecedor: " . $stmt->error, 500);
    }
}

/**
 * Excluir fornecedor (soft delete)
 */
function excluirFornecedor($id, $empresaId, $conn) {
    // Verificar se existem contas a pagar vinculadas
    $sqlCheck = "SELECT COUNT(*) as total FROM contas_pagar 
                 WHERE fornecedor_id = ? AND empresa_id = ? AND removido_em IS NULL";
    $stmtCheck = $conn->prepare($sqlCheck);
    $stmtCheck->bind_param("ii", $id, $empresaId);
    $stmtCheck->execute();
    $resultado = $stmtCheck->get_result()->fetch_assoc();
    
    if ($resultado["total"] > 0) {
        responderErro("Não é possível excluir. Existem contas a pagar vinculadas a este fornecedor.", 400);
    }
    
    $sql = "UPDATE fornecedores SET removido_em = NOW() 
            WHERE id = ? AND empresa_id = ? AND removido_em IS NULL";
    
    $stmt = $conn->prepare($sql);
    $stmt->bind_param("ii", $id, $empresaId);
    
    if ($stmt->execute() && $stmt->affected_rows > 0) {
        responderSucesso("Fornecedor excluído com sucesso");
    } else {
        responderErro("Fornecedor não encontrado ou já excluído", 404);
    }
}
?>
