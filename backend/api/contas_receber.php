<?php
/**
 * API de Contas a Receber
 * Gerenciamento de contas a receber do módulo financeiro
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
            buscarContaReceber($_GET["id"], $empresaId, $conn);
        } elseif (isset($_GET["action"]) && $_GET["action"] === "vencidas") {
            listarContasVencidas($empresaId, $conn);
        } elseif (isset($_GET["action"]) && $_GET["action"] === "a_vencer") {
            listarContasAVencer($empresaId, $conn);
        } else {
            listarContasReceber($empresaId, $conn);
        }
        break;

    case "POST":
        if (isset($_GET["action"]) && $_GET["action"] === "receber") {
            registrarRecebimento($_GET["id"] ?? null, $empresaId, $conn);
        } else {
            criarContaReceber($empresaId, $conn);
        }
        break;

    case "PUT":
        if (isset($_GET["id"])) {
            atualizarContaReceber($_GET["id"], $empresaId, $conn);
        } else {
            responderErro("ID da conta não fornecido", 400);
        }
        break;

    case "DELETE":
        if (isset($_GET["id"])) {
            excluirContaReceber($_GET["id"], $empresaId, $conn);
        } else {
            responderErro("ID da conta não fornecido", 400);
        }
        break;

    default:
        responderErro("Método não suportado", 405);
}

/**
 * Listar todas as contas a receber da empresa
 */
function listarContasReceber($empresaId, $conn) {
    $sql = "SELECT cr.*, 
                   c.nome as cliente_nome,
                   cat.nome as categoria_nome,
                   cb.nome as conta_bancaria_nome
            FROM contas_receber cr
            LEFT JOIN cliente c ON cr.cliente_id = c.id
            LEFT JOIN categorias_financeiras cat ON cr.categoria_id = cat.id
            LEFT JOIN contas_bancarias cb ON cr.conta_bancaria_id = cb.id
            WHERE cr.empresa_id = ? AND cr.removido_em IS NULL
            ORDER BY cr.data_vencimento ASC, cr.criado_em DESC";
    
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
    
    responderSucesso("Contas a receber listadas com sucesso", $contas);
}

/**
 * Listar contas vencidas
 */
function listarContasVencidas($empresaId, $conn) {
    $sql = "SELECT cr.*, 
                   c.nome as cliente_nome,
                   cat.nome as categoria_nome
            FROM contas_receber cr
            LEFT JOIN cliente c ON cr.cliente_id = c.id
            LEFT JOIN categorias_financeiras cat ON cr.categoria_id = cat.id
            WHERE cr.empresa_id = ? 
            AND cr.status IN ('pendente', 'vencido')
            AND cr.data_vencimento < CURDATE()
            AND cr.removido_em IS NULL
            ORDER BY cr.data_vencimento ASC";
    
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
    $sql = "SELECT cr.*, 
                   c.nome as cliente_nome,
                   cat.nome as categoria_nome
            FROM contas_receber cr
            LEFT JOIN cliente c ON cr.cliente_id = c.id
            LEFT JOIN categorias_financeiras cat ON cr.categoria_id = cat.id
            WHERE cr.empresa_id = ? 
            AND cr.status = 'pendente'
            AND cr.data_vencimento BETWEEN CURDATE() AND DATE_ADD(CURDATE(), INTERVAL 7 DAY)
            AND cr.removido_em IS NULL
            ORDER BY cr.data_vencimento ASC";
    
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
function buscarContaReceber($id, $empresaId, $conn) {
    $sql = "SELECT cr.*, 
                   c.nome as cliente_nome,
                   c.email as cliente_email,
                   c.telefone as cliente_telefone,
                   cat.nome as categoria_nome,
                   cb.nome as conta_bancaria_nome
            FROM contas_receber cr
            LEFT JOIN cliente c ON cr.cliente_id = c.id
            LEFT JOIN categorias_financeiras cat ON cr.categoria_id = cat.id
            LEFT JOIN contas_bancarias cb ON cr.conta_bancaria_id = cb.id
            WHERE cr.id = ? AND cr.empresa_id = ? AND cr.removido_em IS NULL";
    
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
 * Criar nova conta a receber
 */
function criarContaReceber($empresaId, $conn) {
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
    
    $sql = "INSERT INTO contas_receber (
                empresa_id, cliente_id, categoria_id, descricao, valor,
                data_vencimento, status, forma_recebimento, numero_documento,
                observacoes, parcela_numero, parcela_total, recorrente_id,
                orcamento_id, atendimento_id
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)";
    
    $stmt = $conn->prepare($sql);
    $stmt->bind_param(
        "iiisdsssssiisii",
        $empresaId,
        $dados["cliente_id"] ?? null,
        $dados["categoria_id"] ?? null,
        $dados["descricao"],
        $dados["valor"],
        $dados["data_vencimento"],
        $status,
        $dados["forma_recebimento"] ?? null,
        $dados["numero_documento"] ?? null,
        $dados["observacoes"] ?? null,
        $dados["parcela_numero"] ?? null,
        $dados["parcela_total"] ?? null,
        $dados["recorrente_id"] ?? null,
        $dados["orcamento_id"] ?? null,
        $dados["atendimento_id"] ?? null
    );
    
    if ($stmt->execute()) {
        $novoId = $conn->insert_id;
        
        // Criar alerta se estiver vencido ou próximo do vencimento
        criarAlertaSeNecessario($novoId, $empresaId, $dados["data_vencimento"], "conta_receber", $conn);
        
        responderSucesso("Conta a receber criada com sucesso", ["id" => $novoId], 201);
    } else {
        responderErro("Erro ao criar conta: " . $stmt->error, 500);
    }
}

/**
 * Atualizar conta a receber existente
 */
function atualizarContaReceber($id, $empresaId, $conn) {
    $dados = json_decode(file_get_contents("php://input"), true);
    
    // Verificar se a conta existe
    $sqlCheck = "SELECT id, status FROM contas_receber 
                 WHERE id = ? AND empresa_id = ? AND removido_em IS NULL";
    $stmtCheck = $conn->prepare($sqlCheck);
    $stmtCheck->bind_param("ii", $id, $empresaId);
    $stmtCheck->execute();
    $resultado = $stmtCheck->get_result();
    
    if ($resultado->num_rows === 0) {
        responderErro("Conta não encontrada", 404);
    }
    
    $contaAtual = $resultado->fetch_assoc();
    
    // Não permitir edição de contas recebidas
    if ($contaAtual["status"] === "recebido") {
        responderErro("Não é possível editar uma conta já recebida", 400);
    }
    
    $sql = "UPDATE contas_receber SET
                cliente_id = ?,
                categoria_id = ?,
                descricao = ?,
                valor = ?,
                data_vencimento = ?,
                forma_recebimento = ?,
                numero_documento = ?,
                observacoes = ?
            WHERE id = ? AND empresa_id = ?";
    
    $stmt = $conn->prepare($sql);
    $stmt->bind_param(
        "iisdsssiii",
        $dados["cliente_id"] ?? null,
        $dados["categoria_id"] ?? null,
        $dados["descricao"],
        $dados["valor"],
        $dados["data_vencimento"],
        $dados["forma_recebimento"] ?? null,
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
 * Registrar recebimento de uma conta
 */
function registrarRecebimento($id, $empresaId, $conn) {
    if (!$id) {
        responderErro("ID da conta não fornecido", 400);
    }
    
    $dados = json_decode(file_get_contents("php://input"), true);
    
    // Validações
    if (empty($dados["valor_recebido"]) || empty($dados["data_recebimento"])) {
        responderErro("Dados de recebimento obrigatórios não fornecidos", 400);
    }
    
    $conn->begin_transaction();
    
    try {
        // Buscar dados da conta
        $sqlConta = "SELECT * FROM contas_receber 
                     WHERE id = ? AND empresa_id = ? AND removido_em IS NULL FOR UPDATE";
        $stmtConta = $conn->prepare($sqlConta);
        $stmtConta->bind_param("ii", $id, $empresaId);
        $stmtConta->execute();
        $resultadoConta = $stmtConta->get_result();
        
        if ($resultadoConta->num_rows === 0) {
            throw new Exception("Conta não encontrada");
        }
        
        $conta = $resultadoConta->fetch_assoc();
        
        if ($conta["status"] === "recebido") {
            throw new Exception("Esta conta já foi recebida");
        }
        
        // Atualizar conta
        $sqlUpdate = "UPDATE contas_receber SET
                      valor_recebido = ?,
                      data_recebimento = ?,
                      status = 'recebido',
                      forma_recebimento = ?,
                      conta_bancaria_id = ?
                      WHERE id = ?";
        
        $stmtUpdate = $conn->prepare($sqlUpdate);
        $stmtUpdate->bind_param(
            "dssii",
            $dados["valor_recebido"],
            $dados["data_recebimento"],
            $dados["forma_recebimento"] ?? null,
            $dados["conta_bancaria_id"] ?? null,
            $id
        );
        $stmtUpdate->execute();
        
        // Se foi informada uma conta bancária, registrar movimentação
        if (!empty($dados["conta_bancaria_id"])) {
            registrarMovimentacaoRecebimento(
                $dados["conta_bancaria_id"],
                $empresaId,
                $dados["valor_recebido"],
                $dados["data_recebimento"],
                $conta["descricao"],
                $conta["categoria_id"],
                $id,
                $conn
            );
        }
        
        // Criar alerta de recebimento realizado
        $sqlAlerta = "INSERT INTO alertas_financeiros (
                       empresa_id, tipo, referencia_tipo, referencia_id, mensagem, data_alerta
                      ) VALUES (?, 'recebimento_realizado', 'conta_receber', ?, ?, ?)";
        $stmtAlerta = $conn->prepare($sqlAlerta);
        $mensagem = "Recebimento realizado: " . $conta["descricao"];
        $stmtAlerta->bind_param("iiss", $empresaId, $id, $mensagem, $dados["data_recebimento"]);
        $stmtAlerta->execute();
        
        $conn->commit();
        responderSucesso("Recebimento registrado com sucesso");
        
    } catch (Exception $e) {
        $conn->rollback();
        responderErro("Erro ao registrar recebimento: " . $e->getMessage(), 500);
    }
}

/**
 * Registrar movimentação bancária de recebimento
 */
function registrarMovimentacaoRecebimento($contaId, $empresaId, $valor, $data, $descricao, $categoriaId, $contaReceberId, $conn) {
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
    $saldoPosterior = $saldoAnterior + $valor;
    
    // Inserir movimentação
    $sqlMov = "INSERT INTO movimentacoes_bancarias (
                empresa_id, conta_bancaria_id, tipo, valor, data_movimentacao,
                descricao, categoria_id, conta_receber_id, saldo_anterior, saldo_posterior
               ) VALUES (?, ?, 'entrada', ?, ?, ?, ?, ?, ?, ?)";
    
    $stmtMov = $conn->prepare($sqlMov);
    $descricaoMov = "Recebimento: " . $descricao;
    $stmtMov->bind_param(
        "iidssidd",
        $empresaId,
        $contaId,
        $valor,
        $data,
        $descricaoMov,
        $categoriaId,
        $contaReceberId,
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
 * Excluir conta a receber (soft delete)
 */
function excluirContaReceber($id, $empresaId, $conn) {
    // Verificar se a conta está recebida
    $sqlCheck = "SELECT status FROM contas_receber 
                 WHERE id = ? AND empresa_id = ? AND removido_em IS NULL";
    $stmtCheck = $conn->prepare($sqlCheck);
    $stmtCheck->bind_param("ii", $id, $empresaId);
    $stmtCheck->execute();
    $resultado = $stmtCheck->get_result();
    
    if ($resultado->num_rows === 0) {
        responderErro("Conta não encontrada", 404);
    }
    
    $conta = $resultado->fetch_assoc();
    
    if ($conta["status"] === "recebido") {
        responderErro("Não é possível excluir uma conta já recebida", 400);
    }
    
    $sql = "UPDATE contas_receber SET removido_em = NOW() 
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
    $sql = "UPDATE contas_receber SET status = 'vencido' WHERE id = ? AND status = 'pendente'";
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
