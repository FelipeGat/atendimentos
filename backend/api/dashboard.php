<?php
// Configuração de headers CORS
header('Access-Control-Allow-Origin: *');
header('Content-Type: application/json; charset=utf-8');

// Configuração de erro para debug
error_reporting(E_ALL);
ini_set('display_errors', 1);

// Função para formatar segundos em horas e minutos
function formatSecondsToTime($seconds) {
    if ($seconds === null || $seconds < 0) {
        return 'N/A';
    }
    $hours = floor($seconds / 3600);
    $minutes = floor(($seconds % 3600) / 60);
    return sprintf('%dh %02dm', $hours, $minutes);
}

try {
    // Incluir arquivo de configuração do banco
    require_once '../config/db.php';
    
    // Obter o período de filtro da requisição
    $period = $_GET['period'] ?? '7-dias';
    $end_date = new DateTime();
    $start_date = new DateTime();

    switch ($period) {
        case 'hoje':
            $start_date->setTime(0, 0, 0);
            break;
        case '7-dias':
            $start_date->modify('-7 days')->setTime(0, 0, 0);
            break;
        case '30-dias':
            $start_date->modify('-30 days')->setTime(0, 0, 0);
            break;
        case 'mes':
            $start_date->modify('first day of this month')->setTime(0, 0, 0);
            break;
        case 'ano':
            $start_date->modify('first day of January this year')->setTime(0, 0, 0);
            break;
    }

    $start_date_str = $start_date->format('Y-m-d H:i:s');
    $end_date_str = $end_date->format('Y-m-d H:i:s');

    // 1. Consulta para KPIs
    // Chamados Abertos Hoje
    $stmt = $pdo->query("SELECT COUNT(*) FROM atendimentos WHERE DATE(data_abertura) = CURDATE() AND removido_em IS NULL");
    $chamadosAbertosHoje = $stmt->fetchColumn();

    // Tempo Médio de Resolução (apenas chamados resolvidos)
    $stmt = $pdo->query("
        SELECT AVG(TIMESTAMPDIFF(SECOND, data_abertura, data_fechamento)) 
        FROM atendimentos 
        WHERE status = 'Resolvido' 
        AND removido_em IS NULL
    ");
    $tempoMedioResolucaoSegundos = $stmt->fetchColumn();
    $tempoMedioResolucao = formatSecondsToTime($tempoMedioResolucaoSegundos);

    // Chamados Pendentes (status diferente de Resolvido)
    $stmt = $pdo->query("SELECT COUNT(*) FROM atendimentos WHERE status != 'Resolvido' AND removido_em IS NULL");
    $chamadosPendentes = $stmt->fetchColumn();

    // Chamados Resolvidos Hoje
    $stmt = $pdo->query("SELECT COUNT(*) FROM atendimentos WHERE status = 'Resolvido' AND DATE(data_fechamento) = CURDATE() AND removido_em IS NULL");
    $chamadosResolvidosHoje = $stmt->fetchColumn();

    // SLA Cumprido
    $stmt = $pdo->query("
        SELECT 
            SUM(CASE WHEN data_fechamento <= data_limite_sla THEN 1 ELSE 0 END) AS sla_cumprido,
            COUNT(*) AS total_resolvidos
        FROM atendimentos 
        WHERE status = 'Resolvido' AND removido_em IS NULL
    ");
    $slaData = $stmt->fetch(PDO::FETCH_ASSOC);
    $slaCumprido = ($slaData['total_resolvidos'] > 0) ? round(($slaData['sla_cumprido'] / $slaData['total_resolvidos']) * 100, 1) : 0;

    // Chamados Críticos Abertos (prioridade alta ou urgente, e status diferente de resolvido)
    $stmt = $pdo->query("
        SELECT COUNT(*) 
        FROM atendimentos 
        WHERE prioridade IN ('Alta', 'Urgente') 
        AND status != 'Resolvido' 
        AND removido_em IS NULL
    ");
    $chamadosCriticosAbertos = $stmt->fetchColumn();


    // 2. Consultas para Gráficos
    // Chamados por Período
    $query = "
        SELECT 
            DATE(data_abertura) AS dia, 
            COUNT(*) AS total_abertos,
            SUM(CASE WHEN status = 'Resolvido' THEN 1 ELSE 0 END) AS total_fechados
        FROM atendimentos 
        WHERE data_abertura BETWEEN ? AND ?
        AND removido_em IS NULL
        GROUP BY dia
        ORDER BY dia
    ";
    $stmt = $pdo->prepare($query);
    $stmt->execute([$start_date_str, $end_date_str]);
    $chamadosPorPeriodoData = $stmt->fetchAll(PDO::FETCH_ASSOC);

    $chamadosPorPeriodo = [
        'labels' => array_column($chamadosPorPeriodoData, 'dia'),
        'abertos' => array_column($chamadosPorPeriodoData, 'total_abertos'),
        'fechados' => array_column($chamadosPorPeriodoData, 'total_fechados'),
    ];

    // Distribuição por Status
    $stmt = $pdo->query("
        SELECT status, COUNT(*) AS count 
        FROM atendimentos 
        WHERE removido_em IS NULL
        GROUP BY status
    ");
    $distribuicaoPorStatusData = $stmt->fetchAll(PDO::FETCH_ASSOC);

    $distribuicaoPorStatus = [
        'labels' => array_column($distribuicaoPorStatusData, 'status'),
        'values' => array_column($distribuicaoPorStatusData, 'count'),
    ];

    // Chamados por Atendente
    $stmt = $pdo->query("
        SELECT u.nome, COUNT(a.id) AS count 
        FROM atendimentos a
        JOIN usuarios u ON a.responsavel_id = u.id
        WHERE a.removido_em IS NULL
        GROUP BY u.nome
        ORDER BY count DESC
        LIMIT 5
    ");
    $chamadosPorAtendenteData = $stmt->fetchAll(PDO::FETCH_ASSOC);

    $chamadosPorAtendente = [
        'labels' => array_column($chamadosPorAtendenteData, 'nome'),
        'values' => array_column($chamadosPorAtendenteData, 'count'),
    ];
    
    // Tempo Médio por Assunto
    $stmt = $pdo->query("
        SELECT a.nome, AVG(TIMESTAMPDIFF(MINUTE, t.data_abertura, t.data_fechamento)) AS tempo_medio_minutos
        FROM atendimentos t
        JOIN assuntos a ON t.assunto_id = a.id
        WHERE t.status = 'Resolvido'
        AND t.removido_em IS NULL
        GROUP BY a.nome
        ORDER BY tempo_medio_minutos DESC
    ");
    $tempoMedioPorAssuntoData = $stmt->fetchAll(PDO::FETCH_ASSOC);
    
    $tempoMedioPorAssunto = [
        'labels' => array_column($tempoMedioPorAssuntoData, 'nome'),
        'values' => array_column($tempoMedioPorAssuntoData, 'tempo_medio_minutos'),
    ];

    // Chamados por Cliente
    $stmt = $pdo->query("
        SELECT c.nome, COUNT(a.id) AS count 
        FROM atendimentos a
        JOIN clientes c ON a.cliente_id = c.id
        WHERE a.removido_em IS NULL
        GROUP BY c.nome
        ORDER BY count DESC
        LIMIT 5
    ");
    $chamadosPorClienteData = $stmt->fetchAll(PDO::FETCH_ASSOC);
    
    $chamadosPorCliente = [
        'labels' => array_column($chamadosPorClienteData, 'nome'),
        'values' => array_column($chamadosPorClienteData, 'count'),
    ];

    // 3. Tabela de Chamados Recentes e Críticos
    $stmt = $pdo->query("
        SELECT 
            t.id, 
            c.nome as cliente_nome, 
            t.status, 
            t.prioridade, 
            TIMESTAMPDIFF(SECOND, t.data_abertura, NOW()) AS tempoEmAberto,
            u.nome AS responsavel
        FROM atendimentos t
        JOIN clientes c ON t.cliente_id = c.id
        LEFT JOIN usuarios u ON t.responsavel_id = u.id
        WHERE t.removido_em IS NULL
        ORDER BY t.prioridade DESC, t.data_abertura DESC
        LIMIT 10
    ");
    $recentCallsData = $stmt->fetchAll(PDO::FETCH_ASSOC);

    $recentCalls = array_map(function($call) {
        $call['tempoEmAberto'] = formatSecondsToTime($call['tempoEmAberto']);
        return $call;
    }, $recentCallsData);


    // Combinação e Resposta Final
    $response = [
        'success' => true,
        'kpis' => [
            'chamadosAbertosHoje' => $chamadosAbertosHoje,
            'tempoMedioResolucao' => $tempoMedioResolucao,
            'chamadosPendentes' => $chamadosPendentes,
            'chamadosResolvidosHoje' => $chamadosResolvidosHoje,
            'slaCumprido' => $slaCumprido,
            'chamadosCriticosAbertos' => $chamadosCriticosAbertos,
        ],
        'charts' => [
            'chamadosPorPeriodo' => $chamadosPorPeriodo,
            'distribuicaoPorStatus' => $distribuicaoPorStatus,
            'chamadosPorAtendente' => $chamadosPorAtendente,
            'tempoMedioPorAssunto' => $tempoMedioPorAssunto,
            'chamadosPorCliente' => $chamadosPorCliente,
        ],
        'recentCalls' => $recentCalls
    ];

    echo json_encode($response, JSON_PRETTY_PRINT);

} catch (PDOException $e) {
    http_response_code(500);
    echo json_encode([
        'success' => false,
        'error' => 'Erro de conexão com o banco de dados: ' . $e->getMessage()
    ]);
} catch (Exception $e) {
    http_response_code(500);
    echo json_encode([
        'success' => false,
        'error' => 'Erro interno: ' . $e->getMessage()
    ]);
}
?>