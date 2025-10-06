<?php
/**
 * API de Contas a Pagar
 * Gerenciamento de contas a pagar do módulo financeiro
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
            buscarContaPagar($_GET["id"], $empresaId, $conn);
        } elseif (isset($_GET["action"]) && $_GET["action"] === "vencidas") {
            listarContasVencidas($empresaId, $conn);
        } elseif (isset($_GET["action"]) && $_GET["action"] === "a_vencer") {
            listarContasAVencer($empresaId, $conn);
        } else {
            listarContasPagar($empresaId, $conn);
        }
        break;

    case "POST":
        if (isset($_GET["action"]) && $_GET["action"] === "pagar") {
            registrarPagamento($_GET["id"] ?? null, $empresaId, $conn);
        } else {
            criarContaPagar($empresaId, $conn);
        }
        break;

    case "PUT":
        if (isset($_GET["id"])) {
            atualizarContaPagar($_GET["id"], $empresaId, $conn);
        } else {
            responderErro("ID da conta não fornecido", 400);
        }
        break;

    case "DELETE":
        if (isset($_GET["id"])) {
            excluirContaPagar($_GET["id"], $empresaId, $conn);
        } else {
            responderErro("ID da conta não fornecido", 400);
        }
        break;

    default:
        responderErro("Método não suportado", 405);
}

/**
 * Listar todas as contas a pagar da empresa
 */
function listarContasPagar($empresaId, $conn) {
    $sql = "SELECT cp.*, 
                   f.nome as fornecedor_nome,
                   cat.nome as categoria_nome,
                   cb.nome as conta_bancaria_nome
            FROM contas_pagar cp
            LEFT JOIN fornecedores f ON cp.fornecedor_id = f.id
            LEFT JOIN categorias_financeiras cat ON cp.categoria_id = cat.id
            LEFT JOIN contas_bancarias cb ON cp.conta_bancaria_id = cb.id
            WHERE cp.empresa_id = ? AND cp.removido_em IS NULL
            ORDER BY cp.data_vencimento ASC, cp.criado_em DESC";
    
    $stmt = $conn->prepare($sql);
    $stmt->bind_param("i", $empresaId);
    $stmt->execute();
    $resultado = $stmt->get_result();
    
    $contas = [];
    while ($row = $resultado->fetch_assoc()) {
        // Atualizar status automaticamente
        if ($row["status"] === "pendente" && $row["data_vencimento"] < date("Y-m-d")) {
            atualizarStatusVencido($row["id"], $conn);
            $row["status"] = "vencido";
        }
        $contas[] = $row;
    }
    
    responderSucesso("Contas a pagar listadas com sucesso", $contas);
}

/**
 * Listar contas vencidas
 */
function listarContasVencidas($empresaId, $conn) {
    $sql = "SELECT cp.*, 
                   f.nome as fornecedor_nome,
                   cat.nome as categoria_nome
            FROM contas_pagar cp
            LEFT JOIN fornecedores f ON cp.fornecedor_id = f.id
            LEFT JOIN categorias_financeiras cat ON cp.categoria_id = cat.id
            WHERE cp.empresa_id = ? 
            AND cp.status IN ('pendente', 'vencido')
            AND cp.data_vencimento < CURDATE()
            AND cp.removido_em IS NULL
            ORDER BY cp.data_vencimento ASC";
    
    $stmt = $conn->prepare($sql);
    $stmt->bind_param("i", $empresaId);
    $stmt->execute();
    $resultado = $stmt->get_result();
    
    $contas = [];
    while ($row = $resultado->fetch_assoc()) {
        $contas[] = $row;
    }
    
    responderSucesso("Contas vencidas listadas com sucesso", $contas);
}

/**
 * Listar contas a vencer (próximos 7 dias)
 */
function listarContasAVencer($empresaId, $conn) {
    $sql = "SELECT cp.*, 
                   f.nome as fornecedor_nome,
                   cat.nome as categoria_nome
            FROM contas_pagar cp
            LEFT JOIN fornecedores f ON cp.fornecedor_id = f.id
            LEFT JOIN categorias_financeiras cat ON cp.categoria_id = cat.id
            WHERE cp.empresa_id = ? 
            AND cp.status = 'pendente'
            AND cp.data_vencimento BETWEEN CURDATE() AND DATE_ADD(CURDATE(), INTERVAL 7 DAY)
            AND cp.removido_em IS NULL
            ORDER BY cp.data_vencimento ASC";
    
    $stmt = $conn->prepare($sql);
    $stmt->bind_param("i", $empresaId);
    $stmt->execute();
    $resultado = $stmt->get_result();
    
    $contas = [];
    while ($row = $resultado->fetch_assoc()) {
        $contas[] = $row;
    }
    
    responderSucesso("Contas a vencer listadas com sucesso", $contas);
}

/**
 * Buscar uma conta específica
 */
function buscarContaPagar($id, $empresaId, $conn) {
    $sql = "SELECT cp.*, 
                   f.nome as fornecedor_nome,
                   cat.nome as categoria_nome,
                   cb.nome as conta_bancaria_nome
            FROM contas_pagar cp
            LEFT JOIN fornecedores f ON cp.fornecedor_id = f.id
            LEFT JOIN categorias_financeiras cat ON cp.categoria_id = cat.id
            LEFT JOIN contas_bancarias cb ON cp.conta_bancaria_id = cb.id
            WHERE cp.id = ? AND cp.empresa_id = ? AND cp.removido_em IS NULL";
    
    $stmt = $conn->prepare($sql);
    $stmt->bind_param("ii", $id, $empresaId);
    $stmt->execute();
    $resultado = $stmt->get_result();
    
    if ($conta = $resultado->fetch_assoc()) {
        responderSucesso("Conta encontrada", $conta);
    } else {
        responderErro("Conta não encontrada", 404);
    }
}

/**
 * Criar nova conta a pagar
 */
function criarContaPagar($empresaId, $conn) {
    $dados = json_decode(file_get_contents("php://input"), true);
    
    // Validações
    if (empty($dados["descricao"]) || empty($dados["valor"]) || empty($dados["data_vencimento"])) {
        responderErro("Dados obrigatórios não fornecidos", 400);
    }
    
    // Determinar status inicial
    $status = "pendente";
    if ($dados["data_vencimento"] < date("Y-m-d")) {
        $status = "vencido";
    }
    
    $sql = "INSERT INTO contas_pagar (
                empresa_id, fornecedor_id, categoria_id, descricao, valor,
                data_vencimento, status, forma_pagamento, numero_documento,
                observacoes, parcela_numero, parcela_total, recorrente_id
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)";
    
    $stmt = $conn->prepare($sql);
    $stmt->bind_param(
        "iiisdsssssiis",
        $empresaId,
        $dados["fornecedor_id"] ?? null,
        $dados["categoria_id"] ?? null,
        $dados["descricao"],
        $dados["valor"],
        $dados["data_vencimento"],
        $status,
        $dados["forma_pagamento"] ?? null,
        $dados["numero_documento"] ?? null,
        $dados["observacoes"] ?? null,
        $dados["parcela_numero"] ?? null,
        $dados["parcela_total"] ?? null,
        $dados["recorrente_id"] ?? null
    );
    
    if ($stmt->execute()) {
        $novoId = $conn->insert_id;
        
        // Criar alerta se estiver vencido ou próximo do vencimento
        criarAlertaSeNecessario($novoId, $empresaId, $dados["data_vencimento"], "conta_pagar", $conn);
        
        responderSucesso("Conta a pagar criada com sucesso", ["id" => $novoId], 201);
    } else {
        responderErro("Erro ao criar conta: " . $stmt->error, 500);
    }
}

/**
 * Atualizar conta a pagar existente
 */
function atualizarContaPagar($id, $empresaId, $conn) {
    $dados = json_decode(file_get_contents("php://input"), true);
    
    // Verificar se a conta existe
    $sqlCheck = "SELECT id, status FROM contas_pagar 
                 WHERE id = ? AND empresa_id = ? AND removido_em IS NULL";
    $stmtCheck = $conn->prepare($sqlCheck);
    $stmtCheck->bind_param("ii", $id, $empresaId);
    $stmtCheck->execute();
    $resultado = $stmtCheck->get_result();
    
    if ($resultado->num_rows === 0) {
        responderErro("Conta não encontrada", 404);
    }
    
    $contaAtual = $resultado->fetch_assoc();
    
    // Não permitir edição de contas pagas
    if ($contaAtual["status"] === "pago") {
        responderErro("Não é possível editar uma conta já paga", 400);
    }
    
    $sql = "UPDATE contas_pagar SET
                fornecedor_id = ?,
                categoria_id = ?,
                descricao = ?,
                valor = ?,
                data_vencimento = ?,
                forma_pagamento = ?,
                numero_documento = ?,
                observacoes = ?
            WHERE id = ? AND empresa_id = ?";
    
    $stmt = $conn->prepare($sql);
    $stmt->bind_param(
        "iisdsssiii",
        $dados["fornecedor_id"] ?? null,
        $dados["categoria_id"] ?? null,
        $dados["descricao"],
        $dados["valor"],
        $dados["data_vencimento"],
        $dados["forma_pagamento"] ?? null,
        $dados["numero_documento"] ?? null,
        $dados["observacoes"] ?? null,
        $id,
        $empresaId
    );
    
    if ($stmt->execute()) {
        responderSucesso("Conta atualizada com sucesso");
    } else {
        responderErro("Erro ao atualizar conta: " . $stmt->error, 500);
    }
}

/**
 * Registrar pagamento de uma conta
 */
function registrarPagamento($id, $empresaId, $conn) {
    if (!$id) {
        responderErro("ID da conta não fornecido", 400);
    }
    
    $dados = json_decode(file_get_contents("php://input"), true);
    
    // Validações
    if (empty($dados["valor_pago"]) || empty($dados["data_pagamento"])) {
        responderErro("Dados de pagamento obrigatórios não fornecidos", 400);
    }
    
    $conn->begin_transaction();
    
    try {
        // Buscar dados da conta
        $sqlConta = "SELECT * FROM contas_pagar 
                     WHERE id = ? AND empresa_id = ? AND removido_em IS NULL FOR UPDATE";
        $stmtConta = $conn->prepare($sqlConta);
        $stmtConta->bind_param("ii", $id, $empresaId);
        $stmtConta->execute();
        $resultadoConta = $stmtConta->get_result();
        
        if ($resultadoConta->num_rows === 0) {
            throw new Exception("Conta não encontrada");
        }
        
        $conta = $resultadoConta->fetch_assoc();
        
        if ($conta["status"] === "pago") {
            throw new Exception("Esta conta já foi paga");
        }
        
        // Atualizar conta
        $sqlUpdate = "UPDATE contas_pagar SET
                      valor_pago = ?,
                      data_pagamento = ?,
                      status = 'pago',
                      forma_pagamento = ?,
                      conta_bancaria_id = ?
                      WHERE id = ?";
        
        $stmtUpdate = $conn->prepare($sqlUpdate);
        $stmtUpdate->bind_param(
            "dssii",
            $dados["valor_pago"],
            $dados["data_pagamento"],
            $dados["forma_pagamento"] ?? null,
            $dados["conta_bancaria_id"] ?? null,
            $id
        );
        $stmtUpdate->execute();
        
        // Se foi informada uma conta bancária, registrar movimentação
        if (!empty($dados["conta_bancaria_id"])) {
            registrarMovimentacaoPagamento(
                $dados["conta_bancaria_id"],
                $empresaId,
                $dados["valor_pago"],
                $dados["data_pagamento"],
                $conta["descricao"],
                $conta["categoria_id"],
                $id,
                $conn
            );
        }
        
        // Criar alerta de pagamento realizado
        $sqlAlerta = "INSERT INTO alertas_financeiros (
                       empresa_id, tipo, referencia_tipo, referencia_id, mensagem, data_alerta
                      ) VALUES (?, 'pagamento_realizado', 'conta_pagar', ?, ?, ?)";
        $stmtAlerta = $conn->prepare($sqlAlerta);
        $mensagem = "Pagamento realizado: " . $conta["descricao"];
        $stmtAlerta->bind_param("iiss", $empresaId, $id, $mensagem, $dados["data_pagamento"]);
        $stmtAlerta->execute();
        
        $conn->commit();
        responderSucesso("Pagamento registrado com sucesso");
        
    } catch (Exception $e) {
        $conn->rollback();
        responderErro("Erro ao registrar pagamento: " . $e->getMessage(), 500);
    }
}

/**
 * Registrar movimentação bancária de pagamento
 */
function registrarMovimentacaoPagamento($contaId, $empresaId, $valor, $data, $descricao, $categoriaId, $contaPagarId, $conn) {
    // Buscar saldo atual
    $sqlSaldo = "SELECT saldo_atual FROM contas_bancarias WHERE id = ? FOR UPDATE";
    $stmtSaldo = $conn->prepare($sqlSaldo);
    $stmtSaldo->bind_param("i", $contaId);
    $stmtSaldo->execute();
    $resultadoSaldo = $stmtSaldo->get_result();
    
    if ($resultadoSaldo->num_rows === 0) {
        throw new Exception("Conta bancária não encontrada");
    }
    
    $conta = $resultadoSaldo->fetch_assoc();
    $saldoAnterior = $conta["saldo_atual"];
    $saldoPosterior = $saldoAnterior - $valor;
    
    // Inserir movimentação
    $sqlMov = "INSERT INTO movimentacoes_bancarias (
                empresa_id, conta_bancaria_id, tipo, valor, data_movimentacao,
                descricao, categoria_id, conta_pagar_id, saldo_anterior, saldo_posterior
               ) VALUES (?, ?, 'saida', ?, ?, ?, ?, ?, ?, ?)";
    
    $stmtMov = $conn->prepare($sqlMov);
    $descricaoMov = "Pagamento: " . $descricao;
    $stmtMov->bind_param(
        "iidssidd",
        $empresaId,
        $contaId,
        $valor,
        $data,
        $descricaoMov,
        $categoriaId,
        $contaPagarId,
        $saldoAnterior,
        $saldoPosterior
    );
    $stmtMov->execute();
    
    // Atualizar saldo
    $sqlUpdateSaldo = "UPDATE contas_bancarias SET saldo_atual = ? WHERE id = ?";
    $stmtUpdateSaldo = $conn->prepare($sqlUpdateSaldo);
    $stmtUpdateSaldo->bind_param("di", $saldoPosterior, $contaId);
    $stmtUpdateSaldo->execute();
}

/**
 * Excluir conta a pagar (soft delete)
 */
function excluirContaPagar($id, $empresaId, $conn) {
    // Verificar se a conta está paga
    $sqlCheck = "SELECT status FROM contas_pagar 
                 WHERE id = ? AND empresa_id = ? AND removido_em IS NULL";
    $stmtCheck = $conn->prepare($sqlCheck);
    $stmtCheck->bind_param("ii", $id, $empresaId);
    $stmtCheck->execute();
    $resultado = $stmtCheck->get_result();
    
    if ($resultado->num_rows === 0) {
        responderErro("Conta não encontrada", 404);
    }
    
    $conta = $resultado->fetch_assoc();
    
    if ($conta["status"] === "pago") {
        responderErro("Não é possível excluir uma conta já paga", 400);
    }
    
    $sql = "UPDATE contas_pagar SET removido_em = NOW() 
            WHERE id = ? AND empresa_id = ?";
    
    $stmt = $conn->prepare($sql);
    $stmt->bind_param("ii", $id, $empresaId);
    
    if ($stmt->execute()) {
        responderSucesso("Conta excluída com sucesso");
    } else {
        responderErro("Erro ao excluir conta", 500);
    }
}

/**
 * Atualizar status para vencido
 */
function atualizarStatusVencido($id, $conn) {
    $sql = "UPDATE contas_pagar SET status = 'vencido' WHERE id = ? AND status = 'pendente'";
    $stmt = $conn->prepare($sql);
    $stmt->bind_param("i", $id);
    $stmt->execute();
}

/**
 * Criar alerta se necessário
 */
function criarAlertaSeNecessario($contaId, $empresaId, $dataVencimento, $tipo, $conn) {
    $hoje = date("Y-m-d");
    $diasAteVencimento = (strtotime($dataVencimento) - strtotime($hoje)) / 86400;
    
    $tipoAlerta = null;
    $mensagem = "";
    
    if ($diasAteVencimento < 0) {
        $tipoAlerta = "vencido";
        $mensagem = "Conta vencida";
    } elseif ($diasAteVencimento <= 3) {
        $tipoAlerta = "vencimento_proximo";
        $mensagem = "Conta vence em " . ceil($diasAteVencimento) . " dia(s)";
    }
    
    if ($tipoAlerta) {
        $sql = "INSERT INTO alertas_financeiros (
                 empresa_id, tipo, referencia_tipo, referencia_id, mensagem, data_alerta
                ) VALUES (?, ?, ?, ?, ?, ?)";
        $stmt = $conn->prepare($sql);
        $stmt->bind_param("ississ", $empresaId, $tipoAlerta, $tipo, $contaId, $mensagem, $hoje);
        $stmt->execute();
    }
}
?>
