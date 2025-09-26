<?php

require_once __DIR__ . "/../config/cors.php";

// Tratar requisições OPTIONS primeiro
if ($_SERVER["REQUEST_METHOD"] === "OPTIONS") {
    http_response_code(200);
    exit();
}

// Incluir dependências
require_once __DIR__ . "/../config/db.php";
require_once "Orcamento.php";

// NOVA FUNCIONALIDADE: Cache de requisições para prevenir duplicatas
class RequestCache {
    private static $cache = [];
    private static $timeout = 30; // 30 segundos
    
    public static function isRequestProcessing($requestId) {
        if (empty($requestId)) return false;
        
        $now = time();
        
        // Limpar cache expirado
        foreach (self::$cache as $id => $timestamp) {
            if ($now - $timestamp > self::$timeout) {
                unset(self::$cache[$id]);
            }
        }
        
        // Verificar se a requisição já está sendo processada
        if (isset(self::$cache[$requestId])) {
            return true;
        }
        
        // Marcar requisição como em processamento
        self::$cache[$requestId] = $now;
        return false;
    }
    
    public static function releaseRequest($requestId) {
        if (!empty($requestId)) {
            unset(self::$cache[$requestId]);
        }
    }
}

// Função para responder com sucesso
function responderSucesso($mensagem, $dados = null, $codigo = 200) {
    http_response_code($codigo);
    $resposta = ["success" => true, "message" => $mensagem];
    if ($dados !== null) {
        $resposta["data"] = $dados;
    }
    echo json_encode($resposta, JSON_UNESCAPED_UNICODE);
    exit();
}

// Função para responder com erro
function responderErro($mensagem, $codigo = 400) {
    http_response_code($codigo);
    echo json_encode([
        "success" => false, 
        "message" => $mensagem,
        "error_code" => $codigo
    ], JSON_UNESCAPED_UNICODE);
    exit();
}

// Função melhorada para validar cliente
function validarCliente($cliente_id, $pdo) {
    error_log("🔍 Validando cliente: " . var_export($cliente_id, true));
    
    // Converter para inteiro
    $cliente_id = intval($cliente_id);
    
    if ($cliente_id <= 0) {
        error_log("❌ Cliente inválido: " . $cliente_id);
        return ["valido" => false, "erro" => "Cliente é obrigatório"];
    }
    
    // Verificar se existe no banco
    try {
        $stmt = $pdo->prepare("SELECT id, nome FROM clientes WHERE id = ? AND removido_em IS NULL");
        $stmt->execute([$cliente_id]);
        $cliente = $stmt->fetch(PDO::FETCH_ASSOC);
        
        if (!$cliente) {
            error_log("❌ Cliente não encontrado no banco: " . $cliente_id);
            return ["valido" => false, "erro" => "Cliente selecionado não existe ou foi removido"];
        }
        
        error_log("✅ Cliente validado: " . $cliente['nome']);
        return ["valido" => true, "cliente" => $cliente, "cliente_id" => $cliente_id];
    } catch (Exception $e) {
        error_log("❌ Erro na validação do cliente: " . $e->getMessage());
        return ["valido" => false, "erro" => "Erro ao validar cliente: " . $e->getMessage()];
    }
}

// Função para obter empresa ID do header
function obterEmpresaId() {
    $headers = getallheaders();
    if (isset($headers['X-Empresa-ID'])) {
        return $headers['X-Empresa-ID'];
    }
    if (isset($headers['x-empresa-id'])) {
        return $headers['x-empresa-id'];
    }
    return null;
}

// Função para obter Request ID do header
function obterRequestId() {
    $headers = getallheaders();
    if (isset($headers['X-Request-ID'])) {
        return $headers['X-Request-ID'];
    }
    if (isset($headers['x-request-id'])) {
        return $headers['x-request-id'];
    }
    return null;
}

// Inicialização
$pdo = null;
$orcamento = null;

try {
    $pdo = getConnection();
    if (!$pdo) {
        throw new Exception("Não foi possível obter a conexão PDO.");
    }
    $orcamento = new Orcamento($pdo);
} catch (Exception $e) {
    error_log("Erro na inicialização da API de orçamentos: " . $e->getMessage());
    responderErro("Erro interno do servidor", 500);
}

// Obter empresa ID e Request ID
$empresa_id = obterEmpresaId();
$request_id = obterRequestId();

error_log("🚀 Nova requisição - Request ID: " . ($request_id ?: 'não fornecido') . ", Empresa ID: " . $empresa_id);

// PROTEÇÃO: Verificar requisições duplicadas
if ($request_id && RequestCache::isRequestProcessing($request_id)) {
    error_log("⚠️ Requisição duplicada detectada: " . $request_id);
    responderErro("Requisição já está sendo processada", 409);
}

$request_method = $_SERVER["REQUEST_METHOD"];

try {
    switch ($request_method) {
        case 'GET':
            if (isset($_GET["action"]) && $_GET["action"] == "kpis") {
                try {
                    $kpis_data = $orcamento->readKpis($empresa_id);
                    responderSucesso("KPIs obtidos com sucesso", $kpis_data);
                } catch (Exception $e) {
                    error_log("Erro ao obter KPIs: " . $e->getMessage());
                    responderErro("Erro ao obter KPIs: " . $e->getMessage(), 500);
                }
            } else if (isset($_GET["id"])) {
                try {
                    $id = $_GET["id"];

                    // Buscar o orçamento principal
                    $stmt = $pdo->prepare("
                        SELECT o.*, e.nome AS empresa_nome, c.nome AS cliente_nome
                        FROM orcamentos o
                        LEFT JOIN empresas e ON e.id = o.empresa_id
                        LEFT JOIN clientes c ON c.id = o.cliente_id
                        WHERE o.id = ? AND o.removido_em IS NULL
                        LIMIT 1
                    ");
                    $stmt->execute([$id]);
                    $orc_row = $stmt->fetch(PDO::FETCH_ASSOC);

                    if (!$orc_row) {
                        responderErro("Orçamento não encontrado", 404);
                    }

                    // Buscar itens vinculados
                    $stmtItens = $pdo->prepare("
                        SELECT id, orcamento_id, tipo_item, descricao, tipo_especifico, observacao, quantidade, valor_unitario, valor_total
                        FROM orcamentos_itens
                        WHERE orcamento_id = ? AND removido_em IS NULL
                        ORDER BY id ASC
                    ");
                    $stmtItens->execute([$id]);
                    $itens = $stmtItens->fetchAll(PDO::FETCH_ASSOC);

                    $servicos = [];
                    $materiais = [];
                    foreach ($itens as $it) {
                        $tipo = strtolower(trim($it['tipo_item']));
                        if ($tipo === 'servico' || $tipo === 'serviço') {
                            $servicos[] = $it;
                        } else {
                            $materiais[] = $it;
                        }
                    }

                    // Preparar retorno
                    $orcamento_arr = $orc_row;
                    $orcamento_arr['servicos'] = $servicos;
                    $orcamento_arr['materiais'] = $materiais;

                    responderSucesso("Orçamento encontrado", $orcamento_arr);
                } catch (Exception $e) {
                    error_log("Erro ao buscar orçamento por ID: " . $e->getMessage());
                    responderErro("Erro ao buscar orçamento: " . $e->getMessage(), 500);
                }
            } else {

                try {
        $empresa_id = obterEmpresaId(); 

        $sql = "
            SELECT 
                o.id, o.numero_orcamento, o.valor_total, o.status, o.data_orcamento,
                o.cliente_id, o.empresa_id, o.usuario_id, o.referencia,
                c.nome AS cliente_nome,
                e.nome_fantasia AS empresa_nome
            FROM orcamentos o
            LEFT JOIN clientes c ON o.cliente_id = c.id
            LEFT JOIN empresas e ON o.empresa_id = e.id
            WHERE o.removido_em IS NULL
        ";
        
        $params = [];


                    if (!empty($empresa_id)) {
            $sql .= " AND o.empresa_id = ?";
            $params[] = $empresa_id;
        }

                    $sql .= " ORDER BY o.data_orcamento DESC, o.id DESC";

                    $stmt = $pdo->prepare($sql);
                    $stmt->execute($params);
                    $orcamentos = $stmt->fetchAll(PDO::FETCH_ASSOC);

                    responderSucesso("Orçamentos listados com sucesso", $orcamentos);

                } catch (Exception $e) {
                    error_log("Erro ao listar orçamentos: " . $e->getMessage());
                    responderErro("Erro ao listar orçamentos: " . $e->getMessage(), 500);
                }
            }
            break;

        case 'POST':
            try {
                error_log("📝 INICIO POST ORCAMENTO - Request ID: " . ($request_id ?: 'N/A'));
                
                // Decodificar dados JSON
                $input = file_get_contents("php://input");
                $data = json_decode($input, true);
                
                if (!$data) {
                    $data = $_POST;
                }

                error_log("📊 Dados recebidos: " . json_encode([
                    'cliente_id' => $data["cliente_id"] ?? 'não fornecido',
                    'numero_orcamento' => $data["numero_orcamento"] ?? 'não fornecido',
                    'request_id' => $request_id
                ]));

                // VALIDAÇÃO DO CLIENTE
                $validacao_cliente = validarCliente($data["cliente_id"] ?? null, $pdo);
                
                if (!$validacao_cliente["valido"]) {
                    error_log("❌ ERRO DE VALIDAÇÃO: " . $validacao_cliente["erro"]);
                    // Liberar cache da requisição antes de responder erro
                    if ($request_id) {
                        RequestCache::releaseRequest($request_id);
                    }
                    responderErro($validacao_cliente["erro"], 400);
                }

                // Cliente validado com sucesso
                $cliente_id = $validacao_cliente["cliente_id"];
                $cliente_info = $validacao_cliente["cliente"];
                
                error_log("✅ Cliente validado: ID=" . $cliente_id . ", Nome=" . $cliente_info['nome']);

                // Definir propriedades do orçamento
                $orcamento->empresa_id = $empresa_id;
                $orcamento->cliente_id = $cliente_id;
                $orcamento->usuario_id = $data["usuario_id"] ?? 1;
                $orcamento->referencia = $data["referencia"] ?? null;
                $orcamento->data_orcamento = $data["data_orcamento"] ?? date("Y-m-d");
                $orcamento->validade_orcamento = $data["validade_orcamento"] ?? null;
                $orcamento->prazo_inicio = $data["prazo_inicio"] ?? null;
                $orcamento->prazo_duracao = $data["prazo_duracao"] ?? null;
                $orcamento->observacoes = $data["observacoes"] ?? null;
                $orcamento->imposto_percentual = $data["imposto_percentual"] ?? 0;
                $orcamento->frete = $data["frete"] ?? 0;
                $orcamento->desconto_valor = $data["desconto_valor"] ?? 0;
                $orcamento->desconto_percentual = $data["desconto_percentual"] ?? 0;
                $orcamento->tipo_desconto = $data["tipo_desconto"] ?? "valor";
                $orcamento->condicoes_pagamento = $data["condicoes_pagamento"] ?? null;
                $orcamento->meios_pagamento = $data["meios_pagamento"] ?? null;
                $orcamento->anotacoes_internas = $data["anotacoes_internas"] ?? null;
                $orcamento->valor_total = $data["valor_total"] ?? 0;
                $orcamento->status = "Rascunho";

                // Gerar número do orçamento
                if (empty($data["numero_orcamento"])) {
                    // Gerar número do orçamento sequencial por empresa e incrementar contador
                    $orcamento->numero_orcamento = $orcamento->getAndIncrementNextNumeroOrcamento($orcamento->empresa_id);
                } else {
                    $orcamento->numero_orcamento = $data["numero_orcamento"];
                }

                // Tentar criar o orçamento
                if ($orcamento->create()) {
                    error_log("✅ Orçamento criado com sucesso. ID: " . $orcamento->id);
                    
                    // Processar itens se existirem
                    if (isset($data["servicos"]) && is_array($data["servicos"])) {
                        foreach ($data["servicos"] as $servico_data) {
                            if (method_exists($orcamento, 'createItem')) {
                                $orcamento->createItem(array_merge($servico_data, [
                                    "orcamento_id" => $orcamento->id, 
                                    "tipo_item" => "Servico"
                                ]));
                            }
                        }
                    }
                    
                    if (isset($data["materiais"]) && is_array($data["materiais"])) {
                        foreach ($data["materiais"] as $material_data) {
                            if (method_exists($orcamento, 'createItem')) {
                                $orcamento->createItem(array_merge($material_data, [
                                    "orcamento_id" => $orcamento->id, 
                                    "tipo_item" => "Material"
                                ]));
                            }
                        }
                    }

                    // Liberar cache da requisição
                    if ($request_id) {
                        RequestCache::releaseRequest($request_id);
                    }

                    error_log("🎉 SUCESSO COMPLETO - Request ID: " . ($request_id ?: 'N/A'));
                    responderSucesso("Orçamento criado com sucesso", [
                        "id" => $orcamento->id, 
                        "numero_orcamento" => $orcamento->numero_orcamento,
                        "cliente_nome" => $cliente_info['nome']
                    ]);
                } else {
                    error_log("❌ ERRO: Falha ao criar orçamento na classe");
                    if ($request_id) {
                        RequestCache::releaseRequest($request_id);
                    }
                    responderErro("Erro ao criar orçamento", 500);
                }
            } catch (Exception $e) {
                error_log("❌ ERRO GERAL: " . $e->getMessage());
                if ($request_id) {
                    RequestCache::releaseRequest($request_id);
                }
                responderErro("Erro ao processar criação: " . $e->getMessage(), 500);
            }
            break;

        case 'PUT':
    try {
        if (!isset($_GET["id"])) {
            responderErro("ID do orçamento é obrigatório", 400);
        }

        $orcamento_id = $_GET["id"];

        $input = file_get_contents("php://input");
        $data = json_decode($input, true);
        if (!$data) {
            $data = $_POST;
        }

        // ✅ Validação do cliente
        $validacao_cliente = validarCliente($data["cliente_id"] ?? null, $pdo);
        if (!$validacao_cliente["valido"]) {
            if ($request_id) {
                RequestCache::releaseRequest($request_id);
            }
            responderErro($validacao_cliente["erro"], 400);
        }

        $cliente_id = $validacao_cliente["cliente_id"];
        $cliente_info = $validacao_cliente["cliente"];

        // ✅ Atualizar dados principais do orçamento
        $stmt = $pdo->prepare("
            UPDATE orcamentos SET
                cliente_id = :cliente_id,
                usuario_id = :usuario_id,
                referencia = :referencia,
                data_orcamento = :data_orcamento,
                validade_orcamento = :validade_orcamento,
                prazo_inicio = :prazo_inicio,
                prazo_duracao = :prazo_duracao,
                observacoes = :observacoes,
                imposto_percentual = :imposto_percentual,
                frete = :frete,
                desconto_valor = :desconto_valor,
                desconto_percentual = :desconto_percentual,
                tipo_desconto = :tipo_desconto,
                condicoes_pagamento = :condicoes_pagamento,
                meios_pagamento = :meios_pagamento,
                anotacoes_internas = :anotacoes_internas,
                valor_total = :valor_total,
                status = :status,
                atualizado_em = NOW()
            WHERE id = :id
        ");
        $stmt->execute([
            ':cliente_id' => $cliente_id,
            ':usuario_id' => $data["usuario_id"] ?? 1,
            ':referencia' => $data["referencia"] ?? null,
            ':data_orcamento' => $data["data_orcamento"] ?? date("Y-m-d"),
            ':validade_orcamento' => $data["validade_orcamento"] ?? null,
            ':prazo_inicio' => $data["prazo_inicio"] ?? null,
            ':prazo_duracao' => $data["prazo_duracao"] ?? null,
            ':observacoes' => $data["observacoes"] ?? null,
            ':imposto_percentual' => $data["imposto_percentual"] ?? 0,
            ':frete' => $data["frete"] ?? 0,
            ':desconto_valor' => $data["desconto_valor"] ?? 0,
            ':desconto_percentual' => $data["desconto_percentual"] ?? 0,
            ':tipo_desconto' => $data["tipo_desconto"] ?? "valor",
            ':condicoes_pagamento' => $data["condicoes_pagamento"] ?? null,
            ':meios_pagamento' => $data["meios_pagamento"] ?? null,
            ':anotacoes_internas' => $data["anotacoes_internas"] ?? null,
            ':valor_total' => $data["valor_total"] ?? 0,
            ':status' => $data["status"] ?? "Rascunho",
            ':id' => $orcamento_id
        ]);

        // ✅ Limpar itens antigos
        $pdo->prepare("DELETE FROM orcamentos_itens WHERE orcamento_id = ?")->execute([$orcamento_id]);

        // ✅ Regravar serviços se existirem
        if (isset($data["servicos"]) && is_array($data["servicos"])) {
            $stmtServico = $pdo->prepare("
                INSERT INTO orcamentos_itens
                (orcamento_id, tipo_item, descricao, tipo_especifico, observacao, quantidade, valor_unitario, valor_total, criado_em)
                VALUES
                (:orcamento_id, 'Servico', :descricao, :tipo_especifico, :observacao, :quantidade, :valor_unitario, :valor_total, NOW())
            ");
            foreach ($data["servicos"] as $servico) {
                $stmtServico->execute([
                    ':orcamento_id' => $orcamento_id,
                    ':descricao' => $servico["descricao"] ?? '',
                    ':tipo_especifico' => $servico["tipo_especifico"] ?? null,
                    ':observacao' => $servico["observacao"] ?? null,
                    ':quantidade' => $servico["quantidade"] ?? 1,
                    ':valor_unitario' => $servico["valor_unitario"] ?? 0,
                    ':valor_total' => $servico["valor_total"] ?? 0
                ]);
            }
        }

        // ✅ Regravar materiais se existirem
        if (isset($data["materiais"]) && is_array($data["materiais"])) {
            $stmtMaterial = $pdo->prepare("
                INSERT INTO orcamentos_itens
                (orcamento_id, tipo_item, descricao, tipo_especifico, observacao, quantidade, valor_unitario, valor_total, criado_em)
                VALUES
                (:orcamento_id, 'Material', :descricao, :tipo_especifico, :observacao, :quantidade, :valor_unitario, :valor_total, NOW())
            ");
            foreach ($data["materiais"] as $material) {
                $stmtMaterial->execute([
                    ':orcamento_id' => $orcamento_id,
                    ':descricao' => $material["descricao"] ?? '',
                    ':tipo_especifico' => $material["tipo_especifico"] ?? null,
                    ':observacao' => $material["observacao"] ?? null,
                    ':quantidade' => $material["quantidade"] ?? 1,
                    ':valor_unitario' => $material["valor_unitario"] ?? 0,
                    ':valor_total' => $material["valor_total"] ?? 0
                ]);
            }
        }

        if ($request_id) {
            RequestCache::releaseRequest($request_id);
        }

        responderSucesso("Orçamento atualizado com sucesso", [
            "id" => $orcamento_id,
            "cliente_nome" => $cliente_info['nome']
        ]);
    } catch (Exception $e) {
        if ($request_id) {
            RequestCache::releaseRequest($request_id);
        }
        responderErro("Erro ao atualizar orçamento: " . $e->getMessage(), 500);
    }
    break;

        case 'DELETE':

            try {
                if (!isset($_GET["id"])) {
                    responderErro("ID do orçamento é obrigatório", 400);
                }

                $orcamento->id = $_GET["id"];

                if ($orcamento->delete()) {
                    responderSucesso("Orçamento removido com sucesso");
                } else {
                    responderErro("Erro ao remover orçamento", 500);
                }
            } catch (Exception $e) {
                responderErro("Erro ao remover orçamento: " . $e->getMessage(), 500);
            }
            break;

        default:
            responderErro("Método não permitido", 405);
            break;
    }
} catch (Exception $e) {
    error_log("Erro geral na API de orçamentos: " . $e->getMessage());
    if ($request_id) {
        RequestCache::releaseRequest($request_id);
    }
    responderErro("Erro interno do servidor", 500);
}

?>
