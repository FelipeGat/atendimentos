<?php
/**
 * API de Contas Bancárias
 * Gerenciamento de contas bancárias do módulo financeiro
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
            buscarContaBancaria($_GET["id"], $empresaId, $conn);
        } elseif (isset($_GET["action"]) && $_GET["action"] === "movimentacoes") {
            listarMovimentacoes($_GET["conta_id"] ?? null, $empresaId, $conn);
        } else {
            listarContasBancarias($empresaId, $conn);
        }
        break;

    case "POST":
        if (isset($_GET["action"]) && $_GET["action"] === "transferencia") {
            realizarTransferencia($empresaId, $conn);
        } elseif (isset($_GET["action"]) && $_GET["action"] === "movimentacao") {
            registrarMovimentacao($empresaId, $conn);
        } else {
            criarContaBancaria($empresaId, $conn);
        }
        break;

    case "PUT":
        if (isset($_GET["id"])) {
            atualizarContaBancaria($_GET["id"], $empresaId, $conn);
        } else {
            responderErro("ID da conta bancária não fornecido", 400);
        }
        break;

    case "DELETE":
        if (isset($_GET["id"])) {
            excluirContaBancaria($_GET["id"], $empresaId, $conn);
        } else {
            responderErro("ID da conta bancária não fornecido", 400);
        }
        break;

    default:
        responderErro("Método não suportado", 405);
}

/**
 * Listar todas as contas bancárias da empresa
 */
function listarContasBancarias($empresaId, $conn) {
    $sql = "SELECT * FROM contas_bancarias 
            WHERE empresa_id = ? AND removido_em IS NULL 
            ORDER BY nome ASC";
    
    $stmt = $conn->prepare($sql);
    $stmt->bind_param("i", $empresaId);
    $stmt->execute();
    $resultado = $stmt->get_result();
    
    $contas = [];
    while ($row = $resultado->fetch_assoc()) {
        $contas[] = $row;
    }
    
    responderSucesso("Contas bancárias listadas com sucesso", $contas);
}

/**
 * Buscar uma conta bancária específica
 */
function buscarContaBancaria($id, $empresaId, $conn) {
    $sql = "SELECT * FROM contas_bancarias 
            WHERE id = ? AND empresa_id = ? AND removido_em IS NULL";
    
    $stmt = $conn->prepare($sql);
    $stmt->bind_param("ii", $id, $empresaId);
    $stmt->execute();
    $resultado = $stmt->get_result();
    
    if ($conta = $resultado->fetch_assoc()) {
        responderSucesso("Conta bancária encontrada", $conta);
    } else {
        responderErro("Conta bancária não encontrada", 404);
    }
}

/**
 * Criar nova conta bancária
 */
function criarContaBancaria($empresaId, $conn) {
    $dados = json_decode(file_get_contents("php://input"), true);
    
    // Validações
    if (empty($dados["nome"])) {
        responderErro("Nome da conta é obrigatório", 400);
    }
    
    $saldoInicial = $dados["saldo_inicial"] ?? 0.00;
    
    $sql = "INSERT INTO contas_bancarias (
                empresa_id, nome, banco, agencia, numero_conta, tipo_conta,
                saldo_inicial, saldo_atual, cor, icone_banco, ativo, observacoes
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)";
    
    $stmt = $conn->prepare($sql);
    $stmt->bind_param(
        "isssssddssss",
        $empresaId,
        $dados["nome"],
        $dados["banco"] ?? null,
        $dados["agencia"] ?? null,
        $dados["numero_conta"] ?? null,
        $dados["tipo_conta"] ?? "corrente",
        $saldoInicial,
        $saldoInicial, // saldo_atual = saldo_inicial
        $dados["cor"] ?? null,
        $dados["icone_banco"] ?? null,
        $dados["ativo"] ?? 1,
        $dados["observacoes"] ?? null
    );
    
    if ($stmt->execute()) {
        $novoId = $conn->insert_id;
        responderSucesso("Conta bancária criada com sucesso", ["id" => $novoId], 201);
    } else {
        responderErro("Erro ao criar conta bancária: " . $stmt->error, 500);
    }
}

/**
 * Atualizar conta bancária existente
 */
function atualizarContaBancaria($id, $empresaId, $conn) {
    $dados = json_decode(file_get_contents("php://input"), true);
    
    // Verificar se a conta existe e pertence à empresa
    $sqlCheck = "SELECT id FROM contas_bancarias WHERE id = ? AND empresa_id = ? AND removido_em IS NULL";
    $stmtCheck = $conn->prepare($sqlCheck);
    $stmtCheck->bind_param("ii", $id, $empresaId);
    $stmtCheck->execute();
    
    if ($stmtCheck->get_result()->num_rows === 0) {
        responderErro("Conta bancária não encontrada", 404);
    }
    
    $sql = "UPDATE contas_bancarias SET
                nome = ?,
                banco = ?,
                agencia = ?,
                numero_conta = ?,
                tipo_conta = ?,
                cor = ?,
                icone_banco = ?,
                ativo = ?,
                observacoes = ?
            WHERE id = ? AND empresa_id = ?";
    
    $stmt = $conn->prepare($sql);
    $stmt->bind_param(
        "sssssssisii",
        $dados["nome"],
        $dados["banco"] ?? null,
        $dados["agencia"] ?? null,
        $dados["numero_conta"] ?? null,
        $dados["tipo_conta"] ?? "corrente",
        $dados["cor"] ?? null,
        $dados["icone_banco"] ?? null,
        $dados["ativo"] ?? 1,
        $dados["observacoes"] ?? null,
        $id,
        $empresaId
    );
    
    if ($stmt->execute()) {
        responderSucesso("Conta bancária atualizada com sucesso");
    } else {
        responderErro("Erro ao atualizar conta bancária: " . $stmt->error, 500);
    }
}

/**
 * Excluir conta bancária (soft delete)
 */
function excluirContaBancaria($id, $empresaId, $conn) {
    // Verificar se existem movimentações vinculadas
    $sqlCheck = "SELECT COUNT(*) as total FROM movimentacoes_bancarias 
                 WHERE conta_bancaria_id = ? AND empresa_id = ? AND removido_em IS NULL";
    $stmtCheck = $conn->prepare($sqlCheck);
    $stmtCheck->bind_param("ii", $id, $empresaId);
    $stmtCheck->execute();
    $resultado = $stmtCheck->get_result()->fetch_assoc();
    
    if ($resultado["total"] > 0) {
        responderErro("Não é possível excluir. Existem movimentações vinculadas a esta conta.", 400);
    }
    
    $sql = "UPDATE contas_bancarias SET removido_em = NOW() 
            WHERE id = ? AND empresa_id = ? AND removido_em IS NULL";
    
    $stmt = $conn->prepare($sql);
    $stmt->bind_param("ii", $id, $empresaId);
    
    if ($stmt->execute() && $stmt->affected_rows > 0) {
        responderSucesso("Conta bancária excluída com sucesso");
    } else {
        responderErro("Conta bancária não encontrada ou já excluída", 404);
    }
}

/**
 * Listar movimentações de uma conta ou todas
 */
function listarMovimentacoes($contaId, $empresaId, $conn) {
    if ($contaId) {
        $sql = "SELECT m.*, c.nome as conta_nome, cat.nome as categoria_nome
                FROM movimentacoes_bancarias m
                LEFT JOIN contas_bancarias c ON m.conta_bancaria_id = c.id
                LEFT JOIN categorias_financeiras cat ON m.categoria_id = cat.id
                WHERE m.conta_bancaria_id = ? AND m.empresa_id = ? AND m.removido_em IS NULL
                ORDER BY m.data_movimentacao DESC, m.criado_em DESC";
        
        $stmt = $conn->prepare($sql);
        $stmt->bind_param("ii", $contaId, $empresaId);
    } else {
        $sql = "SELECT m.*, c.nome as conta_nome, cat.nome as categoria_nome
                FROM movimentacoes_bancarias m
                LEFT JOIN contas_bancarias c ON m.conta_bancaria_id = c.id
                LEFT JOIN categorias_financeiras cat ON m.categoria_id = cat.id
                WHERE m.empresa_id = ? AND m.removido_em IS NULL
                ORDER BY m.data_movimentacao DESC, m.criado_em DESC";
        
        $stmt = $conn->prepare($sql);
        $stmt->bind_param("i", $empresaId);
    }
    
    $stmt->execute();
    $resultado = $stmt->get_result();
    
    $movimentacoes = [];
    while ($row = $resultado->fetch_assoc()) {
        $movimentacoes[] = $row;
    }
    
    responderSucesso("Movimentações listadas com sucesso", $movimentacoes);
}

/**
 * Registrar movimentação manual (entrada ou saída)
 */
function registrarMovimentacao($empresaId, $conn) {
    $dados = json_decode(file_get_contents("php://input"), true);
    
    // Validações
    if (empty($dados["conta_bancaria_id"]) || empty($dados["tipo"]) || empty($dados["valor"])) {
        responderErro("Dados obrigatórios não fornecidos", 400);
    }
    
    $conn->begin_transaction();
    
    try {
        // Buscar saldo atual da conta
        $sqlSaldo = "SELECT saldo_atual FROM contas_bancarias 
                     WHERE id = ? AND empresa_id = ? AND removido_em IS NULL FOR UPDATE";
        $stmtSaldo = $conn->prepare($sqlSaldo);
        $stmtSaldo->bind_param("ii", $dados["conta_bancaria_id"], $empresaId);
        $stmtSaldo->execute();
        $resultadoSaldo = $stmtSaldo->get_result();
        
        if ($resultadoSaldo->num_rows === 0) {
            throw new Exception("Conta bancária não encontrada");
        }
        
        $conta = $resultadoSaldo->fetch_assoc();
        $saldoAnterior = $conta["saldo_atual"];
        
        // Calcular novo saldo
        $valor = floatval($dados["valor"]);
        if ($dados["tipo"] === "entrada") {
            $saldoPosterior = $saldoAnterior + $valor;
        } else {
            $saldoPosterior = $saldoAnterior - $valor;
        }
        
        // Inserir movimentação
        $sqlMov = "INSERT INTO movimentacoes_bancarias (
                    empresa_id, conta_bancaria_id, tipo, valor, data_movimentacao,
                    descricao, categoria_id, saldo_anterior, saldo_posterior, observacoes
                   ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)";
        
        $stmtMov = $conn->prepare($sqlMov);
        $stmtMov->bind_param(
            "iisdssidds",
            $empresaId,
            $dados["conta_bancaria_id"],
            $dados["tipo"],
            $valor,
            $dados["data_movimentacao"] ?? date("Y-m-d"),
            $dados["descricao"],
            $dados["categoria_id"] ?? null,
            $saldoAnterior,
            $saldoPosterior,
            $dados["observacoes"] ?? null
        );
        $stmtMov->execute();
        
        // Atualizar saldo da conta
        $sqlUpdate = "UPDATE contas_bancarias SET saldo_atual = ? WHERE id = ?";
        $stmtUpdate = $conn->prepare($sqlUpdate);
        $stmtUpdate->bind_param("di", $saldoPosterior, $dados["conta_bancaria_id"]);
        $stmtUpdate->execute();
        
        $conn->commit();
        responderSucesso("Movimentação registrada com sucesso", ["novo_saldo" => $saldoPosterior]);
        
    } catch (Exception $e) {
        $conn->rollback();
        responderErro("Erro ao registrar movimentação: " . $e->getMessage(), 500);
    }
}

/**
 * Realizar transferência entre contas
 */
function realizarTransferencia($empresaId, $conn) {
    $dados = json_decode(file_get_contents("php://input"), true);
    
    // Validações
    if (empty($dados["conta_origem_id"]) || empty($dados["conta_destino_id"]) || empty($dados["valor"])) {
        responderErro("Dados obrigatórios não fornecidos", 400);
    }
    
    if ($dados["conta_origem_id"] === $dados["conta_destino_id"]) {
        responderErro("Conta de origem e destino não podem ser iguais", 400);
    }
    
    $conn->begin_transaction();
    
    try {
        $valor = floatval($dados["valor"]);
        $dataTransferencia = $dados["data_transferencia"] ?? date("Y-m-d");
        $descricao = $dados["descricao"] ?? "Transferência entre contas";
        
        // Buscar saldo da conta origem
        $sqlOrigem = "SELECT saldo_atual, nome FROM contas_bancarias 
                      WHERE id = ? AND empresa_id = ? AND removido_em IS NULL FOR UPDATE";
        $stmtOrigem = $conn->prepare($sqlOrigem);
        $stmtOrigem->bind_param("ii", $dados["conta_origem_id"], $empresaId);
        $stmtOrigem->execute();
        $resultadoOrigem = $stmtOrigem->get_result();
        
        if ($resultadoOrigem->num_rows === 0) {
            throw new Exception("Conta de origem não encontrada");
        }
        
        $contaOrigem = $resultadoOrigem->fetch_assoc();
        $saldoOrigemAnterior = $contaOrigem["saldo_atual"];
        $saldoOrigemPosterior = $saldoOrigemAnterior - $valor;
        
        if ($saldoOrigemPosterior < 0) {
            throw new Exception("Saldo insuficiente na conta de origem");
        }
        
        // Buscar saldo da conta destino
        $sqlDestino = "SELECT saldo_atual, nome FROM contas_bancarias 
                       WHERE id = ? AND empresa_id = ? AND removido_em IS NULL FOR UPDATE";
        $stmtDestino = $conn->prepare($sqlDestino);
        $stmtDestino->bind_param("ii", $dados["conta_destino_id"], $empresaId);
        $stmtDestino->execute();
        $resultadoDestino = $stmtDestino->get_result();
        
        if ($resultadoDestino->num_rows === 0) {
            throw new Exception("Conta de destino não encontrada");
        }
        
        $contaDestino = $resultadoDestino->fetch_assoc();
        $saldoDestinoAnterior = $contaDestino["saldo_atual"];
        $saldoDestinoPosterior = $saldoDestinoAnterior + $valor;
        
        // Registrar saída na conta origem
        $sqlMovOrigem = "INSERT INTO movimentacoes_bancarias (
                          empresa_id, conta_bancaria_id, tipo, valor, data_movimentacao,
                          descricao, conta_destino_id, saldo_anterior, saldo_posterior
                         ) VALUES (?, ?, 'transferencia', ?, ?, ?, ?, ?, ?)";
        $stmtMovOrigem = $conn->prepare($sqlMovOrigem);
        $stmtMovOrigem->bind_param(
            "iidsidd",
            $empresaId,
            $dados["conta_origem_id"],
            $valor,
            $dataTransferencia,
            "Transferência para " . $contaDestino["nome"] . " - " . $descricao,
            $dados["conta_destino_id"],
            $saldoOrigemAnterior,
            $saldoOrigemPosterior
        );
        $stmtMovOrigem->execute();
        
        // Registrar entrada na conta destino
        $sqlMovDestino = "INSERT INTO movimentacoes_bancarias (
                           empresa_id, conta_bancaria_id, tipo, valor, data_movimentacao,
                           descricao, conta_destino_id, saldo_anterior, saldo_posterior
                          ) VALUES (?, ?, 'transferencia', ?, ?, ?, ?, ?, ?)";
        $stmtMovDestino = $conn->prepare($sqlMovDestino);
        $stmtMovDestino->bind_param(
            "iidsidd",
            $empresaId,
            $dados["conta_destino_id"],
            $valor,
            $dataTransferencia,
            "Transferência de " . $contaOrigem["nome"] . " - " . $descricao,
            $dados["conta_origem_id"],
            $saldoDestinoAnterior,
            $saldoDestinoPosterior
        );
        $stmtMovDestino->execute();
        
        // Atualizar saldos
        $sqlUpdateOrigem = "UPDATE contas_bancarias SET saldo_atual = ? WHERE id = ?";
        $stmtUpdateOrigem = $conn->prepare($sqlUpdateOrigem);
        $stmtUpdateOrigem->bind_param("di", $saldoOrigemPosterior, $dados["conta_origem_id"]);
        $stmtUpdateOrigem->execute();
        
        $sqlUpdateDestino = "UPDATE contas_bancarias SET saldo_atual = ? WHERE id = ?";
        $stmtUpdateDestino = $conn->prepare($sqlUpdateDestino);
        $stmtUpdateDestino->bind_param("di", $saldoDestinoPosterior, $dados["conta_destino_id"]);
        $stmtUpdateDestino->execute();
        
        $conn->commit();
        responderSucesso("Transferência realizada com sucesso", [
            "saldo_origem" => $saldoOrigemPosterior,
            "saldo_destino" => $saldoDestinoPosterior
        ]);
        
    } catch (Exception $e) {
        $conn->rollback();
        responderErro("Erro ao realizar transferência: " . $e->getMessage(), 500);
    }
}
?>
