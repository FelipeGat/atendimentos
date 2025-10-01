<?php
/**
 * API de Dashboard
 * Sistema de Gerenciamento de Atendimentos
 */

// Definir modo de desenvolvimento (ajuda a mostrar erros mais detalhados)
define('DEVELOPMENT_MODE', true);

// Incluir configurações
require_once __DIR__ . '/../config/cors.php'; // Inclui o arquivo cors.php
require_once __DIR__ . '/../config/db.php'; // Inclui o arquivo db.php e o util.php

// Definir o timezone para garantir consistência nas datas
date_default_timezone_set('America/Sao_Paulo');

// Variável para armazenar o statement PDO para log em caso de erro
$stmt = null; 

/**
 * Função melhorada para obter o ID da Empresa
 */
function obterEmpresaId() {
    $empresa_id = null;

    // 1. Tenta via $_SERVER com underscore (Apache/Nginx converte hífen em underscore)
    if (isset($_SERVER['HTTP_X_EMPRESA_ID'])) {
        $empresa_id = $_SERVER['HTTP_X_EMPRESA_ID'];
    }
    
    // 2. Tenta com hífen (algumas configurações)
    if (!$empresa_id && isset($_SERVER['HTTP_X-EMPRESA-ID'])) {
        $empresa_id = $_SERVER['HTTP_X-EMPRESA-ID'];
    }
    
    // 3. Tenta ler a partir dos cabeçalhos brutos
    if (!$empresa_id && function_exists('apache_request_headers')) {
        $headers = apache_request_headers();
        if (isset($headers['X-Empresa-ID'])) {
            $empresa_id = $headers['X-Empresa-ID'];
        } elseif (isset($headers['x-empresa-id'])) {
            $empresa_id = $headers['x-empresa-id'];
        }
    }
    
    // 4. Última tentativa: via getallheaders() (mais confiável)
    if (!$empresa_id && function_exists('getallheaders')) {
        $all_headers = getallheaders();
        if (isset($all_headers['X-Empresa-ID'])) {
            $empresa_id = $all_headers['X-Empresa-ID'];
        } elseif (isset($all_headers['x-empresa-id'])) {
            $empresa_id = $all_headers['x-empresa-id'];
        }
    }

    // Garante que é um valor inteiro (se for um valor)
    return $empresa_id ? (int) $empresa_id : null;
}


try {
    // Obter e validar empresa_id
    $empresa_id = obterEmpresaId();
    
    // DEBUG: Log temporário para verificar se empresa_id está sendo recebido
    error_log("Dashboard - Empresa ID recebido: " . ($empresa_id ?? 'NULL'));
    error_log("Dashboard - Headers: " . json_encode(getallheaders()));
    
    // IMPORTANTE: Para o dashboard, empresa_id é opcional
    // Se não for fornecido, mostra dados agregados de todas as empresas
    // Se não houver empresa_id, usar NULL para indicar "todas as empresas"
    if (!$empresa_id) {
        $empresa_id = null; // Permitir visualização geral
        error_log("Dashboard - Usando modo: TODAS AS EMPRESAS");
    } else {
        error_log("Dashboard - Usando modo: EMPRESA ESPECÍFICA ID=" . $empresa_id);
    }

    // Obter a conexão PDO do db.php
    $pdo = getConnection();
    if (!$pdo) {
        throw new Exception('Não foi possível obter a conexão PDO.');
    }

} catch (Exception $e) {
    // Loga o erro detalhado no servidor
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
 * Obtém os dados consolidados do dashboard
 */
function getDashboardData($pdo, $empresa_id) {
    global $stmt, $DEVELOPMENT_MODE;
    try {
        $dashboard_data = [];
        
        // 1. Estatísticas gerais (incluindo as métricas de TODAS as empresas)
        $dashboard_data['estatisticas'] = getEstatisticasGerais($pdo, $empresa_id);
        
        // 2. Atendimentos por status (FILTRADO por empresa)
        $dashboard_data['atendimentos_por_status'] = getAtendimentosPorStatus($pdo, $empresa_id);
        
        // 3. Atendimentos por prioridade (FILTRADO por empresa)
        $dashboard_data['atendimentos_por_prioridade'] = getAtendimentosPorPrioridade($pdo, $empresa_id);
        
        // 4. Atendimentos recentes (FILTRADO por empresa)
        $dashboard_data['atendimentos_recentes'] = getAtendimentosRecentes($pdo, $empresa_id);
        
        // 5. Clientes com mais atendimentos (FILTRADO por empresa)
        $dashboard_data['top_clientes'] = getTopClientes($pdo, $empresa_id);
        
        // 6. Assuntos mais frequentes (FILTRADO por empresa)
        $dashboard_data['top_assuntos'] = getTopAssuntos($pdo, $empresa_id);
        
        // 7. Performance dos usuários (FILTRADO por empresa)
        $dashboard_data['performance_usuarios'] = getPerformanceUsuarios($pdo, $empresa_id);
        
        // 8. Atendimentos por período (FILTRADO por empresa)
        $dashboard_data['atendimentos_por_periodo'] = getAtendimentosPorPeriodo($pdo, $empresa_id);
        
        responderSucesso('Dados do dashboard obtidos com sucesso', $dashboard_data);
        
    } catch (PDOException $e) {
        $errorMessage = "Erro de PDO (SQL) no dashboard.php: " . $e->getMessage();
        if ($stmt instanceof PDOStatement) {
             $errorMessage .= " | Query: " . $stmt->queryString;
        }
        error_log($errorMessage);
        responderErro('Erro ao obter dados do dashboard: ' . (DEVELOPMENT_MODE ? $e->getMessage() : 'Erro interno no banco de dados'), 500);
    } catch (Exception $e) {
        error_log("Erro ao obter dados do dashboard: " . $e->getMessage());
        responderErro('Erro ao obter dados do dashboard', 500);
    }
}

// ====================================================================
// FUNÇÕES DE EXTRAÇÃO DE DADOS
// ====================================================================

/**
 * Obter estatísticas gerais
 * * ALTERAÇÃO CRÍTICA: Total de Clientes e Equipamentos AGORA consideram TODAS as empresas.
 */
function getEstatisticasGerais($pdo, $empresa_id) {
    global $stmt;
    $stats = [];
    
    // 1. Total de clientes ativos (TODAS AS EMPRESAS)
    $stmt = $pdo->prepare("
        SELECT COUNT(*) as total 
        FROM clientes 
        WHERE ativo = 1 AND removido_em IS NULL
    ");
    $stmt->execute([]); // Nenhum parâmetro
    $stats['total_clientes'] = $stmt->fetchColumn();
    
    // 2. Total de equipamentos ativos (TODAS AS EMPRESAS)
    $stmt = $pdo->prepare("
        SELECT COUNT(*) as total 
        FROM equipamentos 
        WHERE removido_em IS NULL
    ");
    $stmt->execute([]); // Nenhum parâmetro
    $stats['total_equipamentos'] = $stmt->fetchColumn();
    
    // 3. Total de atendimentos (FILTRADO pela empresa atual ou todas)
    if ($empresa_id) {
        $stmt = $pdo->prepare("
            SELECT COUNT(*) as total 
            FROM atendimentos 
            WHERE empresa_id = ? AND removido_em IS NULL
        ");
        $stmt->execute([$empresa_id]);
    } else {
        $stmt = $pdo->prepare("
            SELECT COUNT(*) as total 
            FROM atendimentos 
            WHERE removido_em IS NULL
        ");
        $stmt->execute();
    }
    $stats['total_atendimentos'] = $stmt->fetchColumn();
    
    // 4. Atendimentos em aberto (FILTRADO pela empresa atual ou todas)
    if ($empresa_id) {
        $stmt = $pdo->prepare("
            SELECT COUNT(*) as total 
            FROM atendimentos 
            WHERE empresa_id = ? AND status IN ('aberto', 'em_andamento', 'aguardando_cliente') AND removido_em IS NULL
        ");
        $stmt->execute([$empresa_id]);
    } else {
        $stmt = $pdo->prepare("
            SELECT COUNT(*) as total 
            FROM atendimentos 
            WHERE status IN ('aberto', 'em_andamento', 'aguardando_cliente') AND removido_em IS NULL
        ");
        $stmt->execute();
    }
    $stats['atendimentos_abertos'] = $stmt->fetchColumn();
    
    // 5. Atendimentos concluídos este mês (FILTRADO pela empresa atual ou todas)
    if ($empresa_id) {
        $stmt = $pdo->prepare("
            SELECT COUNT(*) as total 
            FROM atendimentos 
            WHERE empresa_id = ? AND status = 'concluido' 
            AND MONTH(criado_em) = MONTH(CURRENT_DATE()) 
            AND YEAR(criado_em) = YEAR(CURRENT_DATE())
            AND removido_em IS NULL
        ");
        $stmt->execute([$empresa_id]);
    } else {
        $stmt = $pdo->prepare("
            SELECT COUNT(*) as total 
            FROM atendimentos 
            WHERE status = 'concluido' 
            AND MONTH(criado_em) = MONTH(CURRENT_DATE()) 
            AND YEAR(criado_em) = YEAR(CURRENT_DATE())
            AND removido_em IS NULL
        ");
        $stmt->execute();
    }
    $stats['atendimentos_mes'] = $stmt->fetchColumn();
    
    // 6. Receita total dos atendimentos concluídos este mês (FILTRADO pela empresa atual ou todas)
    // IMPORTANTE: Considera apenas orçamentos aprovados E dentro da validade
    if ($empresa_id) {
        $stmt = $pdo->prepare("
            SELECT COALESCE(SUM(o.valor_total), 0) as total 
            FROM atendimentos a
            JOIN orcamentos o ON a.numero_orcamento = o.numero_orcamento AND a.empresa_id = o.empresa_id
            WHERE a.empresa_id = ? 
                AND a.removido_em IS NULL 
                AND LOWER(o.status) = 'aprovado'
                AND o.removido_em IS NULL
                AND (o.validade_orcamento IS NULL OR o.validade_orcamento >= CURRENT_DATE())
                AND MONTH(a.criado_em) = MONTH(CURRENT_DATE()) 
                AND YEAR(a.criado_em) = YEAR(CURRENT_DATE())
        ");
        $stmt->execute([$empresa_id]);
    } else {
        $stmt = $pdo->prepare("
            SELECT COALESCE(SUM(o.valor_total), 0) as total 
            FROM atendimentos a
            JOIN orcamentos o ON a.numero_orcamento = o.numero_orcamento AND a.empresa_id = o.empresa_id
            WHERE a.removido_em IS NULL 
                AND LOWER(o.status) = 'aprovado'
                AND o.removido_em IS NULL
                AND (o.validade_orcamento IS NULL OR o.validade_orcamento >= CURRENT_DATE())
                AND MONTH(a.criado_em) = MONTH(CURRENT_DATE()) 
                AND YEAR(a.criado_em) = YEAR(CURRENT_DATE())
        ");
        $stmt->execute();
    }
    $stats['receita_mes'] = $stmt->fetchColumn();
    
    // DEBUG: Informações adicionais sobre a receita (remover após identificar problema)
    if (DEVELOPMENT_MODE) {
        // Contar quantos orçamentos foram considerados
        if ($empresa_id) {
            $stmt_debug = $pdo->prepare("
                SELECT COUNT(*) 
                FROM atendimentos a
                JOIN orcamentos o ON a.numero_orcamento = o.numero_orcamento AND a.empresa_id = o.empresa_id
                WHERE a.empresa_id = ? 
                    AND a.removido_em IS NULL 
                    AND LOWER(o.status) = 'aprovado'
                    AND o.removido_em IS NULL
                    AND (o.validade_orcamento IS NULL OR o.validade_orcamento >= CURRENT_DATE())
                    AND MONTH(a.criado_em) = MONTH(CURRENT_DATE()) 
                    AND YEAR(a.criado_em) = YEAR(CURRENT_DATE())
            ");
            $stmt_debug->execute([$empresa_id]);
        } else {
            $stmt_debug = $pdo->prepare("
                SELECT COUNT(*) 
                FROM atendimentos a
                JOIN orcamentos o ON a.numero_orcamento = o.numero_orcamento AND a.empresa_id = o.empresa_id
                WHERE a.removido_em IS NULL 
                    AND LOWER(o.status) = 'aprovado'
                    AND o.removido_em IS NULL
                    AND (o.validade_orcamento IS NULL OR o.validade_orcamento >= CURRENT_DATE())
                    AND MONTH(a.criado_em) = MONTH(CURRENT_DATE()) 
                    AND YEAR(a.criado_em) = YEAR(CURRENT_DATE())
            ");
            $stmt_debug->execute();
        }
        $stats['receita_mes_debug'] = [
            'total_orcamentos_contados' => $stmt_debug->fetchColumn(),
            'mes_filtro' => date('m'),
            'ano_filtro' => date('Y'),
            'data_hoje' => date('Y-m-d')
        ];
    }
    
    
    return $stats;
}

/**
 * Obter atendimentos por status (FILTRADO por empresa ou todas)
 */
function getAtendimentosPorStatus($pdo, $empresa_id) {
    global $stmt;
    if ($empresa_id) {
        $stmt = $pdo->prepare("
            SELECT status, COUNT(*) as quantidade
            FROM atendimentos 
            WHERE empresa_id = ? AND removido_em IS NULL
            GROUP BY status
            ORDER BY quantidade DESC
        ");
        $stmt->execute([$empresa_id]);
    } else {
        $stmt = $pdo->prepare("
            SELECT status, COUNT(*) as quantidade
            FROM atendimentos 
            WHERE removido_em IS NULL
            GROUP BY status
            ORDER BY quantidade DESC
        ");
        $stmt->execute();
    }
    return $stmt->fetchAll(PDO::FETCH_ASSOC);
}

/**
 * Obter atendimentos por prioridade (FILTRADO por empresa ou todas)
 */
function getAtendimentosPorPrioridade($pdo, $empresa_id) {
    global $stmt;
    if ($empresa_id) {
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
                    ELSE 5
                END
        ");
        $stmt->execute([$empresa_id]);
    } else {
        $stmt = $pdo->prepare("
            SELECT prioridade, COUNT(*) as quantidade
            FROM atendimentos 
            WHERE removido_em IS NULL
            GROUP BY prioridade
            ORDER BY 
                CASE prioridade 
                    WHEN 'urgente' THEN 1 
                    WHEN 'alta' THEN 2 
                    WHEN 'media' THEN 3 
                    WHEN 'baixa' THEN 4 
                    ELSE 5
                END
        ");
        $stmt->execute();
    }
    return $stmt->fetchAll(PDO::FETCH_ASSOC);
}

/**
 * Obter atendimentos recentes (FILTRADO por empresa ou todas)
 */
function getAtendimentosRecentes($pdo, $empresa_id) {
    global $stmt;
    if ($empresa_id) {
        $stmt = $pdo->prepare("
            SELECT 
                a.id, a.id AS numero_atendimento, a.descricao, a.status, a.prioridade, a.criado_em,
                c.nome as cliente_nome,
                u.nome as usuario_nome
            FROM atendimentos a
            LEFT JOIN clientes c ON a.cliente_id = c.id
            LEFT JOIN usuarios u ON a.atendente_id = u.id
            WHERE a.empresa_id = ? AND a.removido_em IS NULL
            ORDER BY a.criado_em DESC
            LIMIT 10
        ");
        $stmt->execute([$empresa_id]);
    } else {
        $stmt = $pdo->prepare("
            SELECT 
                a.id, a.id AS numero_atendimento, a.descricao, a.status, a.prioridade, a.criado_em,
                c.nome as cliente_nome,
                u.nome as usuario_nome
            FROM atendimentos a
            LEFT JOIN clientes c ON a.cliente_id = c.id
            LEFT JOIN usuarios u ON a.atendente_id = u.id
            WHERE a.removido_em IS NULL
            ORDER BY a.criado_em DESC
            LIMIT 10
        ");
        $stmt->execute();
    }
    return $stmt->fetchAll(PDO::FETCH_ASSOC);
}

/**
 * Obter top clientes com mais atendimentos (FILTRADO por empresa)
 */
function getTopClientes($pdo, $empresa_id) {
    global $stmt;
    $stmt = $pdo->prepare("
        SELECT 
            c.nome,
            COUNT(a.id) as total_atendimentos,
            COALESCE(SUM(
                CASE 
                    WHEN LOWER(o.status) = 'aprovado' 
                        AND o.removido_em IS NULL
                        AND (o.validade_orcamento IS NULL OR o.validade_orcamento >= CURRENT_DATE())
                    THEN o.valor_total 
                    ELSE 0 
                END
            ), 0) as valor_total
        FROM clientes c
        JOIN atendimentos a ON c.id = a.cliente_id AND a.removido_em IS NULL
        LEFT JOIN orcamentos o ON a.numero_orcamento = o.numero_orcamento AND o.empresa_id = ?
        WHERE c.empresa_id = ? AND c.removido_em IS NULL
        GROUP BY c.id, c.nome
        ORDER BY total_atendimentos DESC
        LIMIT 10
    ");
    $stmt->execute([$empresa_id, $empresa_id]);
    return $stmt->fetchAll(PDO::FETCH_ASSOC);
}

/**
 * Obter assuntos mais frequentes (FILTRADO por empresa)
 */
function getTopAssuntos($pdo, $empresa_id) {
    global $stmt;
    $stmt = $pdo->prepare("
        SELECT 
            ass.nome,
            COUNT(a.id) as total_atendimentos
        FROM assuntos ass
        JOIN atendimentos a ON ass.id = a.assunto_id 
        WHERE a.empresa_id = ? AND a.removido_em IS NULL AND ass.removido_em IS NULL
        GROUP BY ass.id, ass.nome
        ORDER BY total_atendimentos DESC
        LIMIT 10
    ");
    $stmt->execute([$empresa_id]);
    return $stmt->fetchAll(PDO::FETCH_ASSOC);
}

/**
 * Obter performance dos usuários (FILTRADO por empresa)
 */
function getPerformanceUsuarios($pdo, $empresa_id) {
    global $stmt;
    $stmt = $pdo->prepare("
        SELECT 
            u.nome,
            COUNT(a.id) as total_atendimentos,
            COUNT(CASE WHEN a.status = 'concluido' THEN 1 END) as atendimentos_concluidos,
            COALESCE(SUM(
                CASE 
                    WHEN LOWER(o.status) = 'aprovado' 
                        AND o.removido_em IS NULL
                        AND (o.validade_orcamento IS NULL OR o.validade_orcamento >= CURRENT_DATE())
                    THEN o.valor_total 
                    ELSE 0 
                END
            ), 0) as valor_total
        FROM usuarios u
        -- JOIN com empresa_tecnicos para garantir que apenas usuários da empresa sejam contados
        INNER JOIN empresa_tecnicos et ON u.id = et.usuario_id 
        LEFT JOIN atendimentos a ON u.id = a.atendente_id AND a.removido_em IS NULL
        LEFT JOIN orcamentos o 
            ON a.numero_orcamento = o.numero_orcamento 
            AND o.empresa_id = ?
        -- Filtro: Pela empresa (et.empresa_id) e usuário ativo (u.bloqueado = 0)
        WHERE et.empresa_id = ? AND u.removido_em IS NULL AND u.bloqueado = 0
        GROUP BY u.id, u.nome
        ORDER BY total_atendimentos DESC
    ");
    $stmt->execute([$empresa_id, $empresa_id]);
    return $stmt->fetchAll(PDO::FETCH_ASSOC);
}

/**
 * Obter atendimentos por período (últimos 30 dias) (FILTRADO por empresa)
 */
function getAtendimentosPorPeriodo($pdo, $empresa_id) {
    global $stmt;
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
    return $stmt->fetchAll(PDO::FETCH_ASSOC);
}