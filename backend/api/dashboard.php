<?php
/**
 * API de Dashboard
 * Sistema de Gerenciamento de Atendimentos
 */

// Definir modo de desenvolvimento
define('DEVELOPMENT_MODE', true);

// Incluir configurações
require_once 'config/cors.php';
require_once 'config/db.php';

try {
    // Obter e validar empresa_id
    $empresa_id = obterEmpresaId();
    if (!$empresa_id) {
        responderErro('ID da empresa não fornecido no cabeçalho X-Empresa-ID', 400);
    }

} catch (Exception $e) {
    error_log("Erro na inicialização da API de dashboard: " . $e->getMessage());
    responderErro('Erro interno do servidor', 500);
}

// Roteamento das requisições
$method = $_SERVER['REQUEST_METHOD'];

if ($method !== 'GET') {
    responderErro('Apenas método GET é permitido para o dashboard', 405);
}

// Obter dados do dashboard
getDashboardData($pdo, $empresa_id);

/**
 * Obter dados consolidados do dashboard
 */
function getDashboardData($pdo, $empresa_id) {
    try {
        $dashboard_data = [];
        
        // 1. Estatísticas gerais
        $dashboard_data['estatisticas'] = getEstatisticasGerais($pdo, $empresa_id);
        
        // 2. Atendimentos por status
        $dashboard_data['atendimentos_por_status'] = getAtendimentosPorStatus($pdo, $empresa_id);
        
        // 3. Atendimentos por prioridade
        $dashboard_data['atendimentos_por_prioridade'] = getAtendimentosPorPrioridade($pdo, $empresa_id);
        
        // 4. Atendimentos recentes
        $dashboard_data['atendimentos_recentes'] = getAtendimentosRecentes($pdo, $empresa_id);
        
        // 5. Clientes com mais atendimentos
        $dashboard_data['top_clientes'] = getTopClientes($pdo, $empresa_id);
        
        // 6. Assuntos mais frequentes
        $dashboard_data['top_assuntos'] = getTopAssuntos($pdo, $empresa_id);
        
        // 7. Performance dos usuários
        $dashboard_data['performance_usuarios'] = getPerformanceUsuarios($pdo, $empresa_id);
        
        // 8. Atendimentos por período (últimos 30 dias)
        $dashboard_data['atendimentos_por_periodo'] = getAtendimentosPorPeriodo($pdo, $empresa_id);
        
        responderSucesso('Dados do dashboard obtidos com sucesso', $dashboard_data);
        
    } catch (PDOException $e) {
        error_log("Erro ao obter dados do dashboard: " . $e->getMessage());
        responderErro('Erro ao obter dados do dashboard', 500);
    }
}
/**
 * Obter estatísticas gerais
 */
function getEstatisticasGerais($pdo, $empresa_id) {
    $stats = [];
    
    // Total de clientes ativos
    $stmt = $pdo->prepare("
        SELECT COUNT(*) as total 
        FROM clientes 
        WHERE empresa_id = ? AND ativo = 1 AND removido_em IS NULL
    ");
    $stmt->execute([$empresa_id]);
    $stats['total_clientes'] = $stmt->fetch()['total'];
    
    // Total de equipamentos ativos
    $stmt = $pdo->prepare("
        SELECT COUNT(*) as total 
        FROM equipamentos 
        WHERE empresa_id = ? AND ativo = 1 AND removido_em IS NULL
    ");
    $stmt->execute([$empresa_id]);
    $stats['total_equipamentos'] = $stmt->fetch()['total'];
    
    // Total de atendimentos
    $stmt = $pdo->prepare("
        SELECT COUNT(*) as total 
        FROM atendimentos 
        WHERE empresa_id = ? AND removido_em IS NULL
    ");
    $stmt->execute([$empresa_id]);
    $stats['total_atendimentos'] = $stmt->fetch()['total'];
    
    // Atendimentos em aberto
    $stmt = $pdo->prepare("
        SELECT COUNT(*) as total 
        FROM atendimentos 
        WHERE empresa_id = ? AND status IN ('aberto', 'em_andamento', 'aguardando_cliente') AND removido_em IS NULL
    ");
    $stmt->execute([$empresa_id]);
    $stats['atendimentos_abertos'] = $stmt->fetch()['total'];
    
    // Atendimentos concluídos este mês
    $stmt = $pdo->prepare("
        SELECT COUNT(*) as total 
        FROM atendimentos 
        WHERE empresa_id = ? AND status = 'concluido' 
        AND MONTH(criado_em) = MONTH(CURRENT_DATE()) 
        AND YEAR(criado_em) = YEAR(CURRENT_DATE())
        AND removido_em IS NULL
    ");
    $stmt->execute([$empresa_id]);
    $stats['atendimentos_mes'] = $stmt->fetch()['total'];
    
    // Receita total dos atendimentos concluídos este mês
    $stmt = $pdo->prepare("
        SELECT COALESCE(SUM(valor_servico), 0) as total 
        FROM atendimentos 
        WHERE empresa_id = ? AND status = 'concluido' 
        AND MONTH(criado_em) = MONTH(CURRENT_DATE()) 
        AND YEAR(criado_em) = YEAR(CURRENT_DATE())
        AND removido_em IS NULL
    ");
    $stmt->execute([$empresa_id]);
    $stats['receita_mes'] = $stmt->fetch()['total'];
    
    return $stats;
}

/**
 * Obter atendimentos por status
 */
function getAtendimentosPorStatus($pdo, $empresa_id) {
    $stmt = $pdo->prepare("
        SELECT status, COUNT(*) as quantidade
        FROM atendimentos 
        WHERE empresa_id = ? AND removido_em IS NULL
        GROUP BY status
        ORDER BY quantidade DESC
    ");
    $stmt->execute([$empresa_id]);
    return $stmt->fetchAll();
}

/**
 * Obter atendimentos por prioridade
 */
function getAtendimentosPorPrioridade($pdo, $empresa_id) {
    $stmt = $pdo->prepare("
        SELECT prioridade, COUNT(*) as quantidade
        FROM atendimentos 
        WHERE empresa_id = ? AND removido_em IS NULL
        GROUP BY prioridade
        ORDER BY 
            CASE prioridade 
                WHEN 'urgente' THEN 1 
                WHEN 'alta' THEN 2 
                WHEN 'media' THEN 3 
                WHEN 'baixa' THEN 4 
            END
    ");
    $stmt->execute([$empresa_id]);
    return $stmt->fetchAll();
}

/**
 * Obter atendimentos recentes
 */
function getAtendimentosRecentes($pdo, $empresa_id) {
    $stmt = $pdo->prepare("
        SELECT 
            a.id, a.descricao, a.status, a.prioridade, a.criado_em,
            c.nome as cliente_nome,
            u.nome as usuario_nome
        FROM atendimentos a
        LEFT JOIN clientes c ON a.cliente_id = c.id
        LEFT JOIN usuarios u ON a.usuario_id = u.id
        WHERE a.empresa_id = ? AND a.removido_em IS NULL
        ORDER BY a.criado_em DESC
        LIMIT 10
    ");
    $stmt->execute([$empresa_id]);
    return $stmt->fetchAll();
}

/**
 * Obter top clientes com mais atendimentos
 */
function getTopClientes($pdo, $empresa_id) {
    $stmt = $pdo->prepare("
        SELECT 
            c.nome,
            COUNT(a.id) as total_atendimentos,
            COALESCE(SUM(a.valor_servico), 0) as valor_total
        FROM clientes c
        LEFT JOIN atendimentos a ON c.id = a.cliente_id AND a.removido_em IS NULL
        WHERE c.empresa_id = ? AND c.removido_em IS NULL
        GROUP BY c.id, c.nome
        HAVING total_atendimentos > 0
        ORDER BY total_atendimentos DESC
        LIMIT 10
    ");
    $stmt->execute([$empresa_id]);
    return $stmt->fetchAll();
}

/**
 * Obter assuntos mais frequentes
 */
function getTopAssuntos($pdo, $empresa_id) {
    $stmt = $pdo->prepare("
        SELECT 
            ass.nome,
            COUNT(a.id) as total_atendimentos
        FROM assuntos ass
        LEFT JOIN atendimentos a ON ass.id = a.assunto_id AND a.removido_em IS NULL
        WHERE ass.empresa_id = ? AND ass.removido_em IS NULL
        GROUP BY ass.id, ass.nome
        HAVING total_atendimentos > 0
        ORDER BY total_atendimentos DESC
        LIMIT 10
    ");
    $stmt->execute([$empresa_id]);
    return $stmt->fetchAll();
}

/**
 * Obter performance dos usuários
 */
function getPerformanceUsuarios($pdo, $empresa_id) {
    $stmt = $pdo->prepare("
        SELECT 
            u.nome,
            COUNT(a.id) as total_atendimentos,
            COUNT(CASE WHEN a.status = 'concluido' THEN 1 END) as atendimentos_concluidos,
            COALESCE(AVG(a.tempo_real), 0) as tempo_medio,
            COALESCE(SUM(a.valor_servico), 0) as valor_total
        FROM usuarios u
        LEFT JOIN atendimentos a ON u.id = a.usuario_id AND a.removido_em IS NULL
        WHERE u.empresa_id = ? AND u.removido_em IS NULL AND u.ativo = 1
        GROUP BY u.id, u.nome
        ORDER BY total_atendimentos DESC
    ");
    $stmt->execute([$empresa_id]);
    return $stmt->fetchAll();
}

/**
 * Obter atendimentos por período (últimos 30 dias)
 */
function getAtendimentosPorPeriodo($pdo, $empresa_id) {
    $stmt = $pdo->prepare("
        SELECT 
            DATE(criado_em) as data,
            COUNT(*) as total_atendimentos,
            COUNT(CASE WHEN status = 'concluido' THEN 1 END) as atendimentos_concluidos
        FROM atendimentos 
        WHERE empresa_id = ? 
        AND criado_em >= DATE_SUB(CURRENT_DATE(), INTERVAL 30 DAY)
        AND removido_em IS NULL
        GROUP BY DATE(criado_em)
        ORDER BY data DESC
    ");
    $stmt->execute([$empresa_id]);
    return $stmt->fetchAll();
}
?>

