<?php
/**
 * API de Lançamentos Recorrentes
 * Gerenciamento de lançamentos recorrentes (automáticos)
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
            buscarLancamentoRecorrente($_GET["id"], $empresaId, $conn);
        } elseif (isset($_GET["action"]) && $_GET["action"] === "gerar") {
            gerarLancamentosRecorrentes($empresaId, $conn);
        } else {
            listarLancamentosRecorrentes($empresaId, $conn);
        }
        break;

    case "POST":
        criarLancamentoRecorrente($empresaId, $conn);
        break;

    case "PUT":
        if (isset($_GET["id"])) {
            atualizarLancamentoRecorrente($_GET["id"], $empresaId, $conn);
        } else {
            responderErro("ID do lançamento não fornecido", 400);
        }
        break;

    case "DELETE":
        if (isset($_GET["id"])) {
            excluirLancamentoRecorrente($_GET["id"], $empresaId, $conn);
        } else {
            responderErro("ID do lançamento não fornecido", 400);
        }
        break;

    default:
        responderErro("Método não suportado", 405);
}

/**
 * Listar todos os lançamentos recorrentes
 */
function listarLancamentosRecorrentes($empresaId, $conn) {
    $sql = "SELECT lr.*,
                   f.nome as fornecedor_nome,
                   c.nome as cliente_nome,
                   cat.nome as categoria_nome
            FROM lancamentos_recorrentes lr
            LEFT JOIN fornecedores f ON lr.fornecedor_id = f.id
            LEFT JOIN cliente c ON lr.cliente_id = c.id
            LEFT JOIN categorias_financeiras cat ON lr.categoria_id = cat.id
            WHERE lr.empresa_id = ? AND lr.removido_em IS NULL
            ORDER BY lr.ativo DESC, lr.data_inicio DESC";
    
    $stmt = $conn->prepare($sql);
    $stmt->bind_param("i", $empresaId);
    $stmt->execute();
    $resultado = $stmt->get_result();
    
    $lancamentos = [];
    while ($row = $resultado->fetch_assoc()) {
        $lancamentos[] = $row;
    }
    
    responderSucesso("Lançamentos recorrentes listados com sucesso", $lancamentos);
}

/**
 * Buscar um lançamento recorrente específico
 */
function buscarLancamentoRecorrente($id, $empresaId, $conn) {
    $sql = "SELECT lr.*,
                   f.nome as fornecedor_nome,
                   c.nome as cliente_nome,
                   cat.nome as categoria_nome
            FROM lancamentos_recorrentes lr
            LEFT JOIN fornecedores f ON lr.fornecedor_id = f.id
            LEFT JOIN cliente c ON lr.cliente_id = c.id
            LEFT JOIN categorias_financeiras cat ON lr.categoria_id = cat.id
            WHERE lr.id = ? AND lr.empresa_id = ? AND lr.removido_em IS NULL";
    
    $stmt = $conn->prepare($sql);
    $stmt->bind_param("ii", $id, $empresaId);
    $stmt->execute();
    $resultado = $stmt->get_result();
    
    if ($lancamento = $resultado->fetch_assoc()) {
        responderSucesso("Lançamento encontrado", $lancamento);
    } else {
        responderErro("Lançamento não encontrado", 404);
    }
}

/**
 * Criar novo lançamento recorrente
 */
function criarLancamentoRecorrente($empresaId, $conn) {
    $dados = json_decode(file_get_contents("php://input"), true);
    
    // Validações
    if (empty($dados["tipo"]) || empty($dados["descricao"]) || empty($dados["valor"]) || 
        empty($dados["frequencia"]) || empty($dados["dia_vencimento"]) || empty($dados["data_inicio"])) {
        responderErro("Dados obrigatórios não fornecidos", 400);
    }
    
    $sql = "INSERT INTO lancamentos_recorrentes (
                empresa_id, tipo, descricao, valor, categoria_id, fornecedor_id, cliente_id,
                conta_bancaria_id, forma_pagamento, frequencia, dia_vencimento, data_inicio,
                data_fim, numero_parcelas, ativo, observacoes
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)";
    
    $stmt = $conn->prepare($sql);
    $stmt->bind_param(
        "issdiiiisisssiis",
        $empresaId,
        $dados["tipo"],
        $dados["descricao"],
        $dados["valor"],
        $dados["categoria_id"] ?? null,
        $dados["fornecedor_id"] ?? null,
        $dados["cliente_id"] ?? null,
        $dados["conta_bancaria_id"] ?? null,
        $dados["forma_pagamento"] ?? null,
        $dados["frequencia"],
        $dados["dia_vencimento"],
        $dados["data_inicio"],
        $dados["data_fim"] ?? null,
        $dados["numero_parcelas"] ?? null,
        $dados["ativo"] ?? 1,
        $dados["observacoes"] ?? null
    );
    
    if ($stmt->execute()) {
        $novoId = $conn->insert_id;
        responderSucesso("Lançamento recorrente criado com sucesso", ["id" => $novoId], 201);
    } else {
        responderErro("Erro ao criar lançamento: " . $stmt->error, 500);
    }
}

/**
 * Atualizar lançamento recorrente
 */
function atualizarLancamentoRecorrente($id, $empresaId, $conn) {
    $dados = json_decode(file_get_contents("php://input"), true);
    
    $sql = "UPDATE lancamentos_recorrentes SET
                tipo = ?,
                descricao = ?,
                valor = ?,
                categoria_id = ?,
                fornecedor_id = ?,
                cliente_id = ?,
                conta_bancaria_id = ?,
                forma_pagamento = ?,
                frequencia = ?,
                dia_vencimento = ?,
                data_inicio = ?,
                data_fim = ?,
                numero_parcelas = ?,
                ativo = ?,
                observacoes = ?
            WHERE id = ? AND empresa_id = ?";
    
    $stmt = $conn->prepare($sql);
    $stmt->bind_param(
        "ssdiiiisisssiisii",
        $dados["tipo"],
        $dados["descricao"],
        $dados["valor"],
        $dados["categoria_id"] ?? null,
        $dados["fornecedor_id"] ?? null,
        $dados["cliente_id"] ?? null,
        $dados["conta_bancaria_id"] ?? null,
        $dados["forma_pagamento"] ?? null,
        $dados["frequencia"],
        $dados["dia_vencimento"],
        $dados["data_inicio"],
        $dados["data_fim"] ?? null,
        $dados["numero_parcelas"] ?? null,
        $dados["ativo"] ?? 1,
        $dados["observacoes"] ?? null,
        $id,
        $empresaId
    );
    
    if ($stmt->execute()) {
        responderSucesso("Lançamento atualizado com sucesso");
    } else {
        responderErro("Erro ao atualizar lançamento: " . $stmt->error, 500);
    }
}

/**
 * Excluir lançamento recorrente
 */
function excluirLancamentoRecorrente($id, $empresaId, $conn) {
    $sql = "UPDATE lancamentos_recorrentes SET removido_em = NOW() 
            WHERE id = ? AND empresa_id = ?";
    
    $stmt = $conn->prepare($sql);
    $stmt->bind_param("ii", $id, $empresaId);
    
    if ($stmt->execute() && $stmt->affected_rows > 0) {
        responderSucesso("Lançamento excluído com sucesso");
    } else {
        responderErro("Lançamento não encontrado", 404);
    }
}

/**
 * Gerar lançamentos recorrentes (executar via cron ou manualmente)
 */
function gerarLancamentosRecorrentes($empresaId, $conn) {
    $hoje = date("Y-m-d");
    $mesAtual = date("m");
    $anoAtual = date("Y");
    
    // Buscar lançamentos recorrentes ativos
    $sql = "SELECT * FROM lancamentos_recorrentes 
            WHERE empresa_id = ? 
            AND ativo = 1 
            AND removido_em IS NULL
            AND data_inicio <= ?
            AND (data_fim IS NULL OR data_fim >= ?)";
    
    $stmt = $conn->prepare($sql);
    $stmt->bind_param("iss", $empresaId, $hoje, $hoje);
    $stmt->execute();
    $resultado = $stmt->get_result();
    
    $gerados = 0;
    
    while ($lancamento = $resultado->fetch_assoc()) {
        // Verificar se já foi gerado para este mês
        $dataVencimento = calcularProximaDataVencimento($lancamento, $mesAtual, $anoAtual);
        
        if (!$dataVencimento) {
            continue; // Não precisa gerar
        }
        
        // Verificar se já existe
        if ($lancamento["tipo"] === "pagar") {
            $sqlCheck = "SELECT id FROM contas_pagar 
                         WHERE recorrente_id = ? 
                         AND MONTH(data_vencimento) = ? 
                         AND YEAR(data_vencimento) = ?";
        } else {
            $sqlCheck = "SELECT id FROM contas_receber 
                         WHERE recorrente_id = ? 
                         AND MONTH(data_vencimento) = ? 
                         AND YEAR(data_vencimento) = ?";
        }
        
        $stmtCheck = $conn->prepare($sqlCheck);
        $stmtCheck->bind_param("iii", $lancamento["id"], $mesAtual, $anoAtual);
        $stmtCheck->execute();
        
        if ($stmtCheck->get_result()->num_rows > 0) {
            continue; // Já foi gerado
        }
        
        // Gerar novo lançamento
        if ($lancamento["tipo"] === "pagar") {
            gerarContaPagar($lancamento, $dataVencimento, $conn);
        } else {
            gerarContaReceber($lancamento, $dataVencimento, $conn);
        }
        
        // Atualizar contador de parcelas geradas
        $sqlUpdate = "UPDATE lancamentos_recorrentes 
                      SET parcelas_geradas = parcelas_geradas + 1 
                      WHERE id = ?";
        $stmtUpdate = $conn->prepare($sqlUpdate);
        $stmtUpdate->bind_param("i", $lancamento["id"]);
        $stmtUpdate->execute();
        
        $gerados++;
        
        // Se atingiu o número de parcelas, desativar
        if ($lancamento["numero_parcelas"] && 
            ($lancamento["parcelas_geradas"] + 1) >= $lancamento["numero_parcelas"]) {
            $sqlDesativar = "UPDATE lancamentos_recorrentes SET ativo = 0 WHERE id = ?";
            $stmtDesativar = $conn->prepare($sqlDesativar);
            $stmtDesativar->bind_param("i", $lancamento["id"]);
            $stmtDesativar->execute();
        }
    }
    
    responderSucesso("Lançamentos gerados com sucesso", ["total_gerado" => $gerados]);
}

/**
 * Calcular próxima data de vencimento
 */
function calcularProximaDataVencimento($lancamento, $mes, $ano) {
    $dia = $lancamento["dia_vencimento"];
    
    // Ajustar dia se for maior que o último dia do mês
    $ultimoDiaMes = date("t", strtotime("$ano-$mes-01"));
    if ($dia > $ultimoDiaMes) {
        $dia = $ultimoDiaMes;
    }
    
    $dataVencimento = sprintf("%04d-%02d-%02d", $ano, $mes, $dia);
    
    // Verificar se a data está no futuro ou é hoje
    if ($dataVencimento >= date("Y-m-d")) {
        return $dataVencimento;
    }
    
    return null;
}

/**
 * Gerar conta a pagar a partir de lançamento recorrente
 */
function gerarContaPagar($lancamento, $dataVencimento, $conn) {
    $parcelaNumero = $lancamento["parcelas_geradas"] + 1;
    
    $sql = "INSERT INTO contas_pagar (
                empresa_id, fornecedor_id, categoria_id, descricao, valor,
                data_vencimento, status, forma_pagamento, recorrente_id,
                parcela_numero, parcela_total, observacoes
            ) VALUES (?, ?, ?, ?, ?, ?, 'pendente', ?, ?, ?, ?, ?)";
    
    $stmt = $conn->prepare($sql);
    $descricao = $lancamento["descricao"] . " (Recorrente)";
    $stmt->bind_param(
        "iiisdssiiis",
        $lancamento["empresa_id"],
        $lancamento["fornecedor_id"],
        $lancamento["categoria_id"],
        $descricao,
        $lancamento["valor"],
        $dataVencimento,
        $lancamento["forma_pagamento"],
        $lancamento["id"],
        $parcelaNumero,
        $lancamento["numero_parcelas"],
        $lancamento["observacoes"]
    );
    
    $stmt->execute();
}

/**
 * Gerar conta a receber a partir de lançamento recorrente
 */
function gerarContaReceber($lancamento, $dataVencimento, $conn) {
    $parcelaNumero = $lancamento["parcelas_geradas"] + 1;
    
    $sql = "INSERT INTO contas_receber (
                empresa_id, cliente_id, categoria_id, descricao, valor,
                data_vencimento, status, forma_recebimento, recorrente_id,
                parcela_numero, parcela_total, observacoes
            ) VALUES (?, ?, ?, ?, ?, ?, 'pendente', ?, ?, ?, ?, ?)";
    
    $stmt = $conn->prepare($sql);
    $descricao = $lancamento["descricao"] . " (Recorrente)";
    $stmt->bind_param(
        "iiisdssiiis",
        $lancamento["empresa_id"],
        $lancamento["cliente_id"],
        $lancamento["categoria_id"],
        $descricao,
        $lancamento["valor"],
        $dataVencimento,
        $lancamento["forma_pagamento"],
        $lancamento["id"],
        $parcelaNumero,
        $lancamento["numero_parcelas"],
        $lancamento["observacoes"]
    );
    
    $stmt->execute();
}
?>
