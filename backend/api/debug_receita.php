<?php
/**
 * SCRIPT DE DEBUG - Verificar por que orçamento aprovado não aparece na receita
 * Acesse via: /backend/api/debug_receita.php
 */

require_once __DIR__ . '/../config/db.php';

header("Content-Type: application/json; charset=UTF-8");
header("Access-Control-Allow-Origin: *");

try {
    $pdo = getConnection();
    
    $debug = [
        "timestamp" => date('Y-m-d H:i:s'),
        "mes_atual" => date('m'),
        "ano_atual" => date('Y'),
        "data_hoje" => date('Y-m-d')
    ];
    
    // 1. Listar TODOS os orçamentos aprovados
    $stmt = $pdo->prepare("
        SELECT 
            o.id,
            o.numero_orcamento,
            o.empresa_id,
            o.status,
            o.valor_total,
            o.validade_orcamento,
            o.criado_em,
            o.removido_em,
            CASE 
                WHEN o.validade_orcamento IS NULL THEN 'SEM_VALIDADE'
                WHEN o.validade_orcamento >= CURRENT_DATE() THEN 'VALIDO'
                ELSE 'VENCIDO'
            END as status_validade
        FROM orcamentos o
        WHERE o.status = 'aprovado'
        ORDER BY o.criado_em DESC
        LIMIT 20
    ");
    $stmt->execute();
    $debug["orcamentos_aprovados"] = $stmt->fetchAll(PDO::FETCH_ASSOC);
    
    // 2. Listar atendimentos com orçamento
    $stmt = $pdo->prepare("
        SELECT 
            a.id as atendimento_id,
            a.numero_orcamento,
            a.empresa_id,
            a.status as status_atendimento,
            a.criado_em,
            a.removido_em,
            MONTH(a.criado_em) as mes_criacao,
            YEAR(a.criado_em) as ano_criacao
        FROM atendimentos a
        WHERE a.numero_orcamento IS NOT NULL
        ORDER BY a.criado_em DESC
        LIMIT 20
    ");
    $stmt->execute();
    $debug["atendimentos_com_orcamento"] = $stmt->fetchAll(PDO::FETCH_ASSOC);
    
    // 3. Query EXATA usada no dashboard para receita
    $stmt = $pdo->prepare("
        SELECT 
            a.id as atendimento_id,
            a.numero_orcamento,
            a.criado_em as atendimento_criado,
            o.id as orcamento_id,
            o.valor_total,
            o.status as orcamento_status,
            o.validade_orcamento,
            o.removido_em as orcamento_removido,
            MONTH(a.criado_em) = MONTH(CURRENT_DATE()) as mes_ok,
            YEAR(a.criado_em) = YEAR(CURRENT_DATE()) as ano_ok,
            (o.validade_orcamento IS NULL OR o.validade_orcamento >= CURRENT_DATE()) as validade_ok,
            a.removido_em IS NULL as atendimento_ativo,
            o.removido_em IS NULL as orcamento_ativo,
            o.status = 'aprovado' as status_ok
        FROM atendimentos a
        JOIN orcamentos o ON a.numero_orcamento = o.numero_orcamento AND a.empresa_id = o.empresa_id
        WHERE MONTH(a.criado_em) = MONTH(CURRENT_DATE()) 
            AND YEAR(a.criado_em) = YEAR(CURRENT_DATE())
        ORDER BY a.criado_em DESC
    ");
    $stmt->execute();
    $debug["query_dashboard_detalhada"] = $stmt->fetchAll(PDO::FETCH_ASSOC);
    
    // 4. Calcular receita atual (como no dashboard)
    $stmt = $pdo->prepare("
        SELECT COALESCE(SUM(o.valor_total), 0) as total 
        FROM atendimentos a
        JOIN orcamentos o ON a.numero_orcamento = o.numero_orcamento AND a.empresa_id = o.empresa_id
        WHERE a.removido_em IS NULL 
            AND o.status = 'aprovado'
            AND o.removido_em IS NULL
            AND (o.validade_orcamento IS NULL OR o.validade_orcamento >= CURRENT_DATE())
            AND MONTH(a.criado_em) = MONTH(CURRENT_DATE()) 
            AND YEAR(a.criado_em) = YEAR(CURRENT_DATE())
    ");
    $stmt->execute();
    $debug["receita_calculada"] = $stmt->fetchColumn();
    
    // 5. Verificar por que orçamentos podem estar sendo excluídos
    $stmt = $pdo->prepare("
        SELECT 
            'Atendimento sem orçamento' as motivo,
            COUNT(*) as quantidade
        FROM atendimentos a
        WHERE a.numero_orcamento IS NULL
            AND MONTH(a.criado_em) = MONTH(CURRENT_DATE())
            AND YEAR(a.criado_em) = YEAR(CURRENT_DATE())
        
        UNION ALL
        
        SELECT 
            'Orçamento não aprovado' as motivo,
            COUNT(*) as quantidade
        FROM atendimentos a
        JOIN orcamentos o ON a.numero_orcamento = o.numero_orcamento AND a.empresa_id = o.empresa_id
        WHERE o.status != 'aprovado'
            AND MONTH(a.criado_em) = MONTH(CURRENT_DATE())
            AND YEAR(a.criado_em) = YEAR(CURRENT_DATE())
        
        UNION ALL
        
        SELECT 
            'Orçamento vencido' as motivo,
            COUNT(*) as quantidade
        FROM atendimentos a
        JOIN orcamentos o ON a.numero_orcamento = o.numero_orcamento AND a.empresa_id = o.empresa_id
        WHERE o.validade_orcamento IS NOT NULL 
            AND o.validade_orcamento < CURRENT_DATE()
            AND MONTH(a.criado_em) = MONTH(CURRENT_DATE())
            AND YEAR(a.criado_em) = YEAR(CURRENT_DATE())
        
        UNION ALL
        
        SELECT 
            'Atendimento fora do mês' as motivo,
            COUNT(*) as quantidade
        FROM atendimentos a
        JOIN orcamentos o ON a.numero_orcamento = o.numero_orcamento AND a.empresa_id = o.empresa_id
        WHERE (MONTH(a.criado_em) != MONTH(CURRENT_DATE())
            OR YEAR(a.criado_em) != YEAR(CURRENT_DATE()))
            AND o.status = 'aprovado'
    ");
    $stmt->execute();
    $debug["motivos_exclusao"] = $stmt->fetchAll(PDO::FETCH_ASSOC);
    
    echo json_encode($debug, JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE);
    
} catch (Exception $e) {
    echo json_encode([
        "error" => true,
        "message" => $e->getMessage()
    ], JSON_PRETTY_PRINT);
}
?>
