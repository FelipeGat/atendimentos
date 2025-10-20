<?php
/**
 * API de Fornecedores
 * Gerenciamento de fornecedores (Pessoa Física e Jurídica)
 */

require_once __DIR__ . "/../config/cors.php";
require_once __DIR__ . "/../config/db.php";
require_once __DIR__ . "/../config/util.php";

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
    $result = $stmt->get_result();
    
    $fornecedores = [];
    while ($row = $result->fetch_assoc()) {
        $fornecedores[] = $row;
    }
    
    responderSucesso("Fornecedores listados com sucesso", $fornecedores);
}

/**
 * Buscar fornecedor por ID
 */
function buscarFornecedor($id, $empresaId, $conn) {
    $sql = "SELECT * FROM fornecedores 
            WHERE id = ? AND empresa_id = ? AND removido_em IS NULL";
    
    $stmt = $conn->prepare($sql);
    $stmt->bind_param("ii", $id, $empresaId);
    $stmt->execute();
    $result = $stmt->get_result();
    
    if ($result->num_rows === 0) {
        responderErro("Fornecedor não encontrado", 404);
    }
    
    $fornecedor = $result->fetch_assoc();
    responderSucesso("Fornecedor encontrado", $fornecedor);
}

/**
 * Criar novo fornecedor
 */
function criarFornecedor($empresaId, $conn) {
    $dados = json_decode(file_get_contents("php://input"), true);
    
    // Validações
    if (empty($dados["cpf_cnpj"])) {
        responderErro("CPF/CNPJ é obrigatório", 400);
    }
    
    if (empty($dados["nome"]) && empty($dados["razao_social"])) {
        responderErro("Nome ou Razão Social é obrigatório", 400);
    }
    
    // Verificar se CPF/CNPJ já existe
    $cpfCnpj = limparCPFCNPJ($dados["cpf_cnpj"]);
    $sqlCheck = "SELECT id FROM fornecedores 
                 WHERE cpf_cnpj = ? AND empresa_id = ? AND removido_em IS NULL";
    $stmtCheck = $conn->prepare($sqlCheck);
    $stmtCheck->bind_param("si", $cpfCnpj, $empresaId);
    $stmtCheck->execute();
    $resultCheck = $stmtCheck->get_result();
    
    if ($resultCheck->num_rows > 0) {
        responderErro("CPF/CNPJ já cadastrado", 400);
    }
    
    // Definir tipo de pessoa baseado no tamanho do CPF/CNPJ
    $tipoPessoa = strlen($cpfCnpj) === 11 ? 'fisica' : 'juridica';
    
    // Preparar dados
    $nome = $dados["nome"] ?? $dados["razao_social"] ?? '';
    $razaoSocial = $dados["razao_social"] ?? '';
    $nomeFantasia = $dados["nome_fantasia"] ?? '';
    $inscricaoEstadual = $dados["inscricao_estadual"] ?? null;
    $inscricaoMunicipal = $dados["inscricao_municipal"] ?? null;
    $email = $dados["email"] ?? null;
    $telefone = $dados["telefone"] ?? null;
    $celular = $dados["celular"] ?? null;
    $cep = $dados["cep"] ?? null;
    $logradouro = $dados["logradouro"] ?? null;
    $numero = $dados["numero"] ?? null;
    $complemento = $dados["complemento"] ?? null;
    $bairro = $dados["bairro"] ?? null;
    $cidade = $dados["cidade"] ?? null;
    $estado = $dados["estado"] ?? null;
    $observacoes = $dados["observacoes"] ?? null;
    $ativo = isset($dados["ativo"]) ? (int)$dados["ativo"] : 1;
    
    $sql = "INSERT INTO fornecedores (
                empresa_id, tipo_pessoa, cpf_cnpj, nome, razao_social, nome_fantasia,
                inscricao_estadual, inscricao_municipal, email, telefone, celular,
                cep, logradouro, numero, complemento, bairro, cidade, estado,
                observacoes, ativo, criado_em
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW())";
    
    $stmt = $conn->prepare($sql);
    $stmt->bind_param(
        "issssssssssssssssssi",
        $empresaId, $tipoPessoa, $cpfCnpj, $nome, $razaoSocial, $nomeFantasia,
        $inscricaoEstadual, $inscricaoMunicipal, $email, $telefone, $celular,
        $cep, $logradouro, $numero, $complemento, $bairro, $cidade, $estado,
        $observacoes, $ativo
    );
    
    if ($stmt->execute()) {
        $novoId = $conn->insert_id;
        responderSucesso("Fornecedor criado com sucesso", ["id" => $novoId]);
    } else {
        responderErro("Erro ao criar fornecedor: " . $stmt->error, 500);
    }
}

/**
 * Atualizar fornecedor
 */
function atualizarFornecedor($id, $empresaId, $conn) {
    $dados = json_decode(file_get_contents("php://input"), true);
    
    // Verificar se fornecedor existe
    $sqlCheck = "SELECT id FROM fornecedores 
                 WHERE id = ? AND empresa_id = ? AND removido_em IS NULL";
    $stmtCheck = $conn->prepare($sqlCheck);
    $stmtCheck->bind_param("ii", $id, $empresaId);
    $stmtCheck->execute();
    $resultCheck = $stmtCheck->get_result();
    
    if ($resultCheck->num_rows === 0) {
        responderErro("Fornecedor não encontrado", 404);
    }
    
    // Preparar dados
    $cpfCnpj = limparCPFCNPJ($dados["cpf_cnpj"]);
    $tipoPessoa = strlen($cpfCnpj) === 11 ? 'fisica' : 'juridica';
    $nome = $dados["nome"] ?? $dados["razao_social"] ?? '';
    $razaoSocial = $dados["razao_social"] ?? '';
    $nomeFantasia = $dados["nome_fantasia"] ?? '';
    $inscricaoEstadual = $dados["inscricao_estadual"] ?? null;
    $inscricaoMunicipal = $dados["inscricao_municipal"] ?? null;
    $email = $dados["email"] ?? null;
    $telefone = $dados["telefone"] ?? null;
    $celular = $dados["celular"] ?? null;
    $cep = $dados["cep"] ?? null;
    $logradouro = $dados["logradouro"] ?? null;
    $numero = $dados["numero"] ?? null;
    $complemento = $dados["complemento"] ?? null;
    $bairro = $dados["bairro"] ?? null;
    $cidade = $dados["cidade"] ?? null;
    $estado = $dados["estado"] ?? null;
    $observacoes = $dados["observacoes"] ?? null;
    $ativo = isset($dados["ativo"]) ? (int)$dados["ativo"] : 1;
    
    $sql = "UPDATE fornecedores SET
                tipo_pessoa = ?, cpf_cnpj = ?, nome = ?, razao_social = ?, nome_fantasia = ?,
                inscricao_estadual = ?, inscricao_municipal = ?, email = ?, telefone = ?, celular = ?,
                cep = ?, logradouro = ?, numero = ?, complemento = ?, bairro = ?, cidade = ?, estado = ?,
                observacoes = ?, ativo = ?, atualizado_em = NOW()
            WHERE id = ? AND empresa_id = ?";
    
    $stmt = $conn->prepare($sql);
    $stmt->bind_param(
        "sssssssssssssssssssii",
        $tipoPessoa, $cpfCnpj, $nome, $razaoSocial, $nomeFantasia,
        $inscricaoEstadual, $inscricaoMunicipal, $email, $telefone, $celular,
        $cep, $logradouro, $numero, $complemento, $bairro, $cidade, $estado,
        $observacoes, $ativo, $id, $empresaId
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
    $sql = "UPDATE fornecedores SET removido_em = NOW() 
            WHERE id = ? AND empresa_id = ?";
    
    $stmt = $conn->prepare($sql);
    $stmt->bind_param("ii", $id, $empresaId);
    
    if ($stmt->execute()) {
        if ($stmt->affected_rows > 0) {
            responderSucesso("Fornecedor excluído com sucesso");
        } else {
            responderErro("Fornecedor não encontrado", 404);
        }
    } else {
        responderErro("Erro ao excluir fornecedor: " . $stmt->error, 500);
    }
}

/**
 * Limpar CPF/CNPJ (remover pontos, traços e barras)
 */
function limparCPFCNPJ($cpfCnpj) {
    return preg_replace('/[^0-9]/', '', $cpfCnpj);
}

