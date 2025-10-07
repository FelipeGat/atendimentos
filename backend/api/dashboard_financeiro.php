<?php
/**
 * API do Dashboard Financeiro
 * Fornece dados consolidados para o dashboard financeiro
 */

require_once __DIR__ . "/../config/cors.php";
require_once __DIR__ . "/../config/db.php";

$metodo = $_SERVER["REQUEST_METHOD"];
$empresaId = obterEmpresaId();

if (!$empresaId) {
    responderErro("ID da empresa não fornecido", 400);
}

if ($metodo === "GET") {
    obterDadosDashboard($empresaId, $conn);
} else {
    responderErro("Método não suportado", 405);
}

/**
 * Obter todos os dados do dashboard financeiro
 */
function obterDadosDashboard($empresaId, $conn) {
    $dados = [];
    
    // 1. Resumo Financeiro
    $dados["resumo"] = obterResumoFinanceiro($empresaId, $conn);
    
    // 2. Contas a Pagar
    $dados["contas_pagar"] = obterResumoContasPagar($empresaId, $conn);
    
    // 3. Contas a Receber
    $dados["contas_receber"] = obterResumoContasReceber($empresaId, $conn);
    
    // 4. Saldo das Contas Bancárias
    $dados["contas_bancarias"] = obterSaldoContasBancarias($empresaId, $conn);
    
    // 5. Alertas
    $dados["alertas"] = obterAlertas($empresaId, $conn);
    
    // 6. Fluxo de Caixa Mensal (últimos 6 meses)
    $dados["fluxo_caixa"] = obterFluxoCaixaMensal($empresaId, $conn);
    
    // 7. Receitas e Despesas por Categoria
    $dados["por_categoria"] = obterReceitasDespesasPorCategoria($empresaId, $conn);
    
    // 8. Movimentações Recentes
    $dados["movimentacoes_recentes"] = obterMovimentacoesRecentes($empresaId, $conn);
    
    responderSucesso("Dados do dashboard obtidos com sucesso", $dados);
}

/**
 * Resumo financeiro geral
 */
function obterResumoFinanceiro($empresaId, $conn) {
    // Saldo total em contas bancárias
    $sqlSaldo = "SELECT COALESCE(SUM(saldo_atual), 0) as saldo_total 
                 FROM contas_bancarias 
                 WHERE empresa_id = ? AND ativo = 1 AND removido_em IS NULL";
    $stmt = $conn->prepare($sqlSaldo);
    $stmt->bind_param("i", $empresaId);
    $stmt->execute();
    $saldoTotal = $stmt->get_result()->fetch_assoc()["saldo_total"];
    
    // Total a pagar (pendente + vencido)
    $sqlPagar = "SELECT COALESCE(SUM(valor - valor_pago), 0) as total_pagar 
                 FROM contas_pagar 
                 WHERE empresa_id = ? AND status IN ('pendente', 'vencido') AND removido_em IS NULL";
    $stmt = $conn->prepare($sqlPagar);
    $stmt->bind_param("i", $empresaId);
    $stmt->execute();
    $totalPagar = $stmt->get_result()->fetch_assoc()["total_pagar"];
    
    // Total a receber (pendente + vencido)
    $sqlReceber = "SELECT COALESCE(SUM(valor - valor_recebido), 0) as total_receber 
                   FROM contas_receber 
                   WHERE empresa_id = ? AND status IN ('pendente', 'vencido') AND removido_em IS NULL";
    $stmt = $conn->prepare($sqlReceber);
    $stmt->bind_param("i", $empresaId);
    $stmt->execute();
    $totalReceber = $stmt->get_result()->fetch_assoc()["total_receber"];
    
    // Receitas do mês atual
    $sqlReceitasMes = "SELECT COALESCE(SUM(valor_recebido), 0) as receitas_mes 
                       FROM contas_receber 
                       WHERE empresa_id = ? 
                       AND status = 'recebido' 
                       AND MONTH(data_recebimento) = MONTH(CURDATE()) 
                       AND YEAR(data_recebimento) = YEAR(CURDATE())
                       AND removido_em IS NULL";
    $stmt = $conn->prepare($sqlReceitasMes);
    $stmt->bind_param("i", $empresaId);
    $stmt->execute();
    $receitasMes = $stmt->get_result()->fetch_assoc()["receitas_mes"];
    
    // Despesas do mês atual
    $sqlDespesasMes = "SELECT COALESCE(SUM(valor_pago), 0) as despesas_mes 
                       FROM contas_pagar 
                       WHERE empresa_id = ? 
                       AND status = 'pago' 
                       AND MONTH(data_pagamento) = MONTH(CURDATE()) 
                       AND YEAR(data_pagamento) = YEAR(CURDATE())
                       AND removido_em IS NULL";
    $stmt = $conn->prepare($sqlDespesasMes);
    $stmt->bind_param("i", $empresaId);
    $stmt->execute();
    $despesasMes = $stmt->get_result()->fetch_assoc()["despesas_mes"];
    
    // Lucro/Prejuízo do mês
    $lucroMes = $receitasMes - $despesasMes;
    
    // Saldo projetado (saldo atual + a receber - a pagar)
    $saldoProjetado = $saldoTotal + $totalReceber - $totalPagar;
    
    return [
        "saldo_total" => floatval($saldoTotal),
        "total_a_pagar" => floatval($totalPagar),
        "total_a_receber" => floatval($totalReceber),
        "receitas_mes" => floatval($receitasMes),
        "despesas_mes" => floatval($despesasMes),
        "lucro_mes" => floatval($lucroMes),
        "saldo_projetado" => floatval($saldoProjetado)
    ];
}

/**
 * Resumo de contas a pagar
 */
function obterResumoContasPagar($empresaId, $conn) {
    $sql = "SELECT 
                COUNT(*) as total,
                COALESCE(SUM(valor), 0) as valor_total,
                COALESCE(SUM(CASE WHEN status = 'vencido' THEN 1 ELSE 0 END), 0) as vencidas,
                COALESCE(SUM(CASE WHEN status = 'vencido' THEN valor ELSE 0 END), 0) as valor_vencido,
                COALESCE(SUM(CASE WHEN status = 'pendente' AND data_vencimento BETWEEN CURDATE() AND DATE_ADD(CURDATE(), INTERVAL 7 DAY) THEN 1 ELSE 0 END), 0) as a_vencer_7_dias,
                COALESCE(SUM(CASE WHEN status = 'pendente' AND data_vencimento BETWEEN CURDATE() AND DATE_ADD(CURDATE(), INTERVAL 7 DAY) THEN valor ELSE 0 END), 0) as valor_a_vencer_7_dias
            FROM contas_pagar 
            WHERE empresa_id = ? AND status IN ('pendente', 'vencido') AND removido_em IS NULL";
    
    $stmt = $conn->prepare($sql);
    $stmt->bind_param("i", $empresaId);
    $stmt->execute();
    $resultado = $stmt->get_result()->fetch_assoc();
    
    return [
        "total" => intval($resultado["total"]),
        "valor_total" => floatval($resultado["valor_total"]),
        "vencidas" => intval($resultado["vencidas"]),
        "valor_vencido" => floatval($resultado["valor_vencido"]),
        "a_vencer_7_dias" => intval($resultado["a_vencer_7_dias"]),
        "valor_a_vencer_7_dias" => floatval($resultado["valor_a_vencer_7_dias"])
    ];
}

/**
 * Resumo de contas a receber
 */
function obterResumoContasReceber($empresaId, $conn) {
    $sql = "SELECT 
                COUNT(*) as total,
                COALESCE(SUM(valor), 0) as valor_total,
                COALESCE(SUM(CASE WHEN status = 'vencido' THEN 1 ELSE 0 END), 0) as vencidas,
                COALESCE(SUM(CASE WHEN status = 'vencido' THEN valor ELSE 0 END), 0) as valor_vencido,
                COALESCE(SUM(CASE WHEN status = 'pendente' AND data_vencimento BETWEEN CURDATE() AND DATE_ADD(CURDATE(), INTERVAL 7 DAY) THEN 1 ELSE 0 END), 0) as a_vencer_7_dias,
                COALESCE(SUM(CASE WHEN status = 'pendente' AND data_vencimento BETWEEN CURDATE() AND DATE_ADD(CURDATE(), INTERVAL 7 DAY) THEN valor ELSE 0 END), 0) as valor_a_vencer_7_dias
            FROM contas_receber 
            WHERE empresa_id = ? AND status IN ('pendente', 'vencido') AND removido_em IS NULL";
    
    $stmt = $conn->prepare($sql);
    $stmt->bind_param("i", $empresaId);
    $stmt->execute();
    $resultado = $stmt->get_result()->fetch_assoc();
    
    return [
        "total" => intval($resultado["total"]),
        "valor_total" => floatval($resultado["valor_total"]),
        "vencidas" => intval($resultado["vencidas"]),
        "valor_vencido" => floatval($resultado["valor_vencido"]),
        "a_vencer_7_dias" => intval($resultado["a_vencer_7_dias"]),
        "valor_a_vencer_7_dias" => floatval($resultado["valor_a_vencer_7_dias"])
    ];
}

/**
 * Saldo das contas bancárias
 */
function obterSaldoContasBancarias($empresaId, $conn) {
    $sql = "SELECT id, nome, banco, tipo_conta, saldo_atual, cor, icone_banco
            FROM contas_bancarias 
            WHERE empresa_id = ? AND ativo = 1 AND removido_em IS NULL
            ORDER BY nome ASC";
    
    $stmt = $conn->prepare($sql);
    $stmt->bind_param("i", $empresaId);
    $stmt->execute();
    $resultado = $stmt->get_result();
    
    $contas = [];
    while ($row = $resultado->fetch_assoc()) {
        $contas[] = [
            "id" => intval($row["id"]),
            "nome" => $row["nome"],
            "banco" => $row["banco"],
            "tipo_conta" => $row["tipo_conta"],
            "saldo_atual" => floatval($row["saldo_atual"]),
            "cor" => $row["cor"],
            "icone_banco" => $row["icone_banco"]
        ];
    }
    
    return $contas;
}

/**
 * Obter alertas não lidos
 */
function obterAlertas($empresaId, $conn) {
    $sql = "SELECT * FROM alertas_financeiros 
            WHERE empresa_id = ? AND lido = 0
            ORDER BY data_alerta DESC, criado_em DESC
            LIMIT 10";
    
    $stmt = $conn->prepare($sql);
    $stmt->bind_param("i", $empresaId);
    $stmt->execute();
    $resultado = $stmt->get_result();
    
    $alertas = [];
    while ($row = $resultado->fetch_assoc()) {
        $alertas[] = $row;
    }
    
    return $alertas;
}

/**
 * Fluxo de caixa mensal (últimos 6 meses)
 */
function obterFluxoCaixaMensal($empresaId, $conn) {
    $meses = [];
    
    for ($i = 5; $i >= 0; $i--) {
        $data = date("Y-m-01", strtotime("-$i months"));
        $ano = date("Y", strtotime($data));
        $mes = date("m", strtotime($data));
        
        // Receitas do mês
        $sqlReceitas = "SELECT COALESCE(SUM(valor_recebido), 0) as receitas 
                        FROM contas_receber 
                        WHERE empresa_id = ? 
                        AND status = 'recebido' 
                        AND YEAR(data_recebimento) = ? 
                        AND MONTH(data_recebimento) = ?
                        AND removido_em IS NULL";
        $stmt = $conn->prepare($sqlReceitas);
        $stmt->bind_param("iii", $empresaId, $ano, $mes);
        $stmt->execute();
        $receitas = $stmt->get_result()->fetch_assoc()["receitas"];
        
        // Despesas do mês
        $sqlDespesas = "SELECT COALESCE(SUM(valor_pago), 0) as despesas 
                        FROM contas_pagar 
                        WHERE empresa_id = ? 
                        AND status = 'pago' 
                        AND YEAR(data_pagamento) = ? 
                        AND MONTH(data_pagamento) = ?
                        AND removido_em IS NULL";
        $stmt = $conn->prepare($sqlDespesas);
        $stmt->bind_param("iii", $empresaId, $ano, $mes);
        $stmt->execute();
        $despesas = $stmt->get_result()->fetch_assoc()["despesas"];
        
        $meses[] = [
            "mes" => date("m/Y", strtotime($data)),
            "mes_nome" => ucfirst(strftime("%B/%Y", strtotime($data))),
            "receitas" => floatval($receitas),
            "despesas" => floatval($despesas),
            "saldo" => floatval($receitas - $despesas)
        ];
    }
    
    return $meses;
}

/**
 * Receitas e despesas por categoria
 */
function obterReceitasDespesasPorCategoria($empresaId, $conn) {
    // Receitas por categoria (mês atual)
    $sqlReceitas = "SELECT 
                        cat.nome as categoria,
                        COALESCE(SUM(cr.valor_recebido), 0) as total
                    FROM contas_receber cr
                    LEFT JOIN categorias_financeiras cat ON cr.categoria_id = cat.id
                    WHERE cr.empresa_id = ? 
                    AND cr.status = 'recebido'
                    AND MONTH(cr.data_recebimento) = MONTH(CURDATE())
                    AND YEAR(cr.data_recebimento) = YEAR(CURDATE())
                    AND cr.removido_em IS NULL
                    GROUP BY cat.id, cat.nome
                    ORDER BY total DESC";
    
    $stmt = $conn->prepare($sqlReceitas);
    $stmt->bind_param("i", $empresaId);
    $stmt->execute();
    $resultadoReceitas = $stmt->get_result();
    
    $receitas = [];
    while ($row = $resultadoReceitas->fetch_assoc()) {
        $receitas[] = [
            "categoria" => $row["categoria"] ?? "Sem categoria",
            "total" => floatval($row["total"])
        ];
    }
    
    // Despesas por categoria (mês atual)
    $sqlDespesas = "SELECT 
                        cat.nome as categoria,
                        COALESCE(SUM(cp.valor_pago), 0) as total
                    FROM contas_pagar cp
                    LEFT JOIN categorias_financeiras cat ON cp.categoria_id = cat.id
                    WHERE cp.empresa_id = ? 
                    AND cp.status = 'pago'
                    AND MONTH(cp.data_pagamento) = MONTH(CURDATE())
                    AND YEAR(cp.data_pagamento) = YEAR(CURDATE())
                    AND cp.removido_em IS NULL
                    GROUP BY cat.id, cat.nome
                    ORDER BY total DESC";
    
    $stmt = $conn->prepare($sqlDespesas);
    $stmt->bind_param("i", $empresaId);
    $stmt->execute();
    $resultadoDespesas = $stmt->get_result();
    
    $despesas = [];
    while ($row = $resultadoDespesas->fetch_assoc()) {
        $despesas[] = [
            "categoria" => $row["categoria"] ?? "Sem categoria",
            "total" => floatval($row["total"])
        ];
    }
    
    return [
        "receitas" => $receitas,
        "despesas" => $despesas
    ];
}

/**
 * Movimentações recentes (últimas 10)
 */
function obterMovimentacoesRecentes($empresaId, $conn) {
    $sql = "SELECT 
                m.id,
                m.tipo,
                m.valor,
                m.data_movimentacao,
                m.descricao,
                cb.nome as conta_nome,
                cat.nome as categoria_nome
            FROM movimentacoes_bancarias m
            LEFT JOIN contas_bancarias cb ON m.conta_bancaria_id = cb.id
            LEFT JOIN categorias_financeiras cat ON m.categoria_id = cat.id
            WHERE m.empresa_id = ? AND m.removido_em IS NULL
            ORDER BY m.data_movimentacao DESC, m.criado_em DESC
            LIMIT 10";
    
    $stmt = $conn->prepare($sql);
    $stmt->bind_param("i", $empresaId);
    $stmt->execute();
    $resultado = $stmt->get_result();
    
    $movimentacoes = [];
    while ($row = $resultado->fetch_assoc()) {
        $movimentacoes[] = [
            "id" => intval($row["id"]),
            "tipo" => $row["tipo"],
            "valor" => floatval($row["valor"]),
            "data_movimentacao" => $row["data_movimentacao"],
            "descricao" => $row["descricao"],
            "conta_nome" => $row["conta_nome"],
            "categoria_nome" => $row["categoria_nome"]
        ];
    }
    
    return $movimentacoes;
}
?>
