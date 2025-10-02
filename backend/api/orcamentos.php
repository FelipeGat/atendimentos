<?php

require_once __DIR__ . "/../config/cors.php";

// Tratar requisições OPTIONS primeiro
if ($_SERVER["REQUEST_METHOD"] === "OPTIONS") {
    http_response_code(200);
    exit();
}

require_once __DIR__ . "/../config/db.php";
require_once "Orcamento.php";

class RequestCache {
    private static $cache = [];
    private static $timeout = 30;
    
    public static function isRequestProcessing($requestId) {
        if (empty($requestId)) return false;
        $now = time();
        foreach (self::$cache as $id => $timestamp) {
            if ($now - $timestamp > self::$timeout) {
                unset(self::$cache[$id]);
            }
        }
        if (isset(self::$cache[$requestId])) {
            return true;
        }
        self::$cache[$requestId] = $now;
        return false;
    }
    
    public static function releaseRequest($requestId) {
        if (!empty($requestId)) {
            unset(self::$cache[$requestId]);
        }
    }
}

function responderSucesso($mensagem, $dados = null, $codigo = 200) {
    http_response_code($codigo);
    $resposta = ["success" => true, "message" => $mensagem];
    if ($dados !== null) {
        $resposta["data"] = $dados;
    }
    echo json_encode($resposta, JSON_UNESCAPED_UNICODE);
    exit();
}

function responderErro($mensagem, $codigo = 400) {
    http_response_code($codigo);
    echo json_encode([
        "success" => false, 
        "message" => $mensagem,
        "error_code" => $codigo
    ], JSON_UNESCAPED_UNICODE);
    exit();
}

function validarCliente($cliente_id, $pdo) {
    $cliente_id = intval($cliente_id);
    if ($cliente_id <= 0) {
        return ["valido" => false, "erro" => "Cliente é obrigatório"];
    }
    try {
        $stmt = $pdo->prepare("SELECT id, nome FROM clientes WHERE id = ? AND removido_em IS NULL");
        $stmt->execute([$cliente_id]);
        $cliente = $stmt->fetch(PDO::FETCH_ASSOC);
        if (!$cliente) {
            return ["valido" => false, "erro" => "Cliente selecionado não existe ou foi removido"];
        }
        return ["valido" => true, "cliente" => $cliente, "cliente_id" => $cliente_id];
    } catch (Exception $e) {
        return ["valido" => false, "erro" => "Erro ao validar cliente: " . $e->getMessage()];
    }
}

function obterEmpresaId($data = null) {
    if ($data !== null && isset($data['empresa_id']) && !empty($data['empresa_id'])) {
        return $data['empresa_id'];
    }
    $headers = getallheaders();
    if (isset($headers['X-Empresa-ID'])) return $headers['X-Empresa-ID'];
    if (isset($headers['x-empresa-id'])) return $headers['x-empresa-id'];
    if (isset($_SERVER['HTTP_X_EMPRESA_ID'])) return $_SERVER['HTTP_X_EMPRESA_ID'];
    return null;
}

function obterRequestId() {
    $headers = getallheaders();
    if (isset($headers['X-Request-ID'])) return $headers['X-Request-ID'];
    if (isset($headers['x-request-id'])) return $headers['x-request-id'];
    return null;
}

$pdo = null;
$orcamento = null;

try {
    $pdo = getConnection();
    if (!$pdo) throw new Exception("Não foi possível obter a conexão PDO.");
    $orcamento = new Orcamento($pdo);
} catch (Exception $e) {
    responderErro("Erro interno do servidor", 500);
}

$empresa_id = obterEmpresaId();
$request_id = obterRequestId();

if ($request_id && RequestCache::isRequestProcessing($request_id)) {
    responderErro("Requisição já está sendo processada", 409);
}

$request_method = $_SERVER["REQUEST_METHOD"];
if ($request_method === 'POST' && isset($_GET['_method']) && strtoupper($_GET['_method']) === 'PUT') {
    $request_method = 'PUT';
}

try {
    switch ($request_method) {
        case 'GET':
            if (isset($_GET["action"]) && $_GET["action"] == "kpis") {
                $kpis_data = $orcamento->readKpis($empresa_id);
                responderSucesso("KPIs obtidos com sucesso", $kpis_data);
            } 
            else if (isset($_GET["id"])) {
                try {
                    $id = $_GET["id"];

                    // 📌 Buscar o orçamento principal
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
                    if (!$orc_row) responderErro("Orçamento não encontrado", 404);

                    // 📌 Buscar itens vinculados
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

                    // 📌 Buscar fotos vinculadas ✅ (NOVO BLOCO)
                    $stmtFotos = $pdo->prepare("
                        SELECT id, caminho, nome_arquivo, criado_em
                        FROM orcamentos_fotos
                        WHERE orcamento_id = ?
                        ORDER BY id ASC
                    ");
                    $stmtFotos->execute([$id]);
                    $fotos = $stmtFotos->fetchAll(PDO::FETCH_ASSOC);

                    // 📤 Preparar retorno
                    $orcamento_arr = $orc_row;
                    $orcamento_arr['servicos'] = $servicos;
                    $orcamento_arr['materiais'] = $materiais;
                    $orcamento_arr['fotos'] = $fotos; // <-- Aqui a mágica ✨

                    responderSucesso("Orçamento encontrado", $orcamento_arr);
                } catch (Exception $e) {
                    responderErro("Erro ao buscar orçamento: " . $e->getMessage(), 500);
                }
            } else {
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
            }
            break;

        case 'POST': // Criar orçamento + fotos
            try {
                $data = $_POST;
                if (!$data) $data = json_decode(file_get_contents("php://input"), true);

                $empresa_id_requisicao = obterEmpresaId($data);
                if (empty($empresa_id_requisicao)) responderErro("Empresa é obrigatória", 400);

                $validacao_cliente = validarCliente($data["cliente_id"] ?? null, $pdo);
                if (!$validacao_cliente["valido"]) responderErro($validacao_cliente["erro"], 400);

                $cliente_id = $validacao_cliente["cliente_id"];
                $cliente_info = $validacao_cliente["cliente"];

                // Propriedades do orçamento
                $orcamento->empresa_id = $empresa_id_requisicao;
                $orcamento->cliente_id = $cliente_id;
                $orcamento->usuario_id = $data["usuario_id"] ?? 1;
                $orcamento->referencia = $data["referencia"] ?? null;
                $orcamento->data_orcamento = $data["data_orcamento"] ?? date("Y-m-d");
                $orcamento->valor_total = $data["valor_total"] ?? 0;
                $orcamento->status = "Rascunho";
                $orcamento->numero_orcamento = empty($data["numero_orcamento"]) ?
                    $orcamento->getAndIncrementNextNumeroOrcamento($empresa_id_requisicao) :
                    $data["numero_orcamento"];

                if ($orcamento->create()) {
                    $orcamento_id = $orcamento->id;

                    // Salvar fotos
                    $upload_dir = __DIR__ . "/../uploads/";
                    if (!is_dir($upload_dir)) mkdir($upload_dir, 0777, true);

                    if (isset($_FILES['fotos_novas'])) {
                        $files_array = $_FILES['fotos_novas'];
                        for ($i = 0; $i < count($files_array['name']); $i++) {
                            if ($files_array['error'][$i] === UPLOAD_ERR_OK) {
                                $nome_original = $files_array['name'][$i];
                                $tmp_name = $files_array['tmp_name'][$i];
                                $extensao = pathinfo($nome_original, PATHINFO_EXTENSION);
                                $nome_unico = "orc_{$orcamento_id}_" . uniqid() . "." . strtolower($extensao);
                                $destino = $upload_dir . $nome_unico;
                                if (move_uploaded_file($tmp_name, $destino)) {
                                    $stmtFoto = $pdo->prepare("
                                        INSERT INTO orcamentos_fotos (orcamento_id, caminho, nome_arquivo, criado_em)
                                        VALUES (?, ?, ?, NOW())
                                    ");
                                    $stmtFoto->execute([$orcamento_id, "uploads/" . $nome_unico, $nome_original]);
                                }
                            }
                        }
                    }

                    responderSucesso("Orçamento criado com sucesso", [
                        "id" => $orcamento_id,
                        "numero_orcamento" => $orcamento->numero_orcamento,
                        "cliente_nome" => $cliente_info['nome']
                    ]);
                } else {
                    responderErro("Erro ao criar orçamento", 500);
                }
            } catch (Exception $e) {
                responderErro("Erro ao processar criação: " . $e->getMessage(), 500);
            }
            break;

       case 'PUT':
    try {
        error_log("📝 INICIO PUT ORCAMENTO (Multi-Foto) - ID: " . ($_GET["id"] ?? 'N/A'));
        
        if (!isset($_GET["id"])) {
            responderErro("ID do orçamento é obrigatório", 400);
        }

        $orcamento_id = $_GET["id"];
        $data = $_POST;
        
        if (!$data) {
            responderErro("Dados de requisição inválidos", 400);
        }
        
        // =======================================================
        // 🚨 NOVO BLOCO DE LÓGICA DE UPLOAD DE MÚLTIPLAS FOTOS
        // =======================================================
        
        $upload_dir = __DIR__ . "/../uploads/";
        if (!is_dir($upload_dir)) {
            mkdir($upload_dir, 0777, true);
        }

        $fotos_salvas = [];

        // 1. Processar novas fotos enviadas
        // O PHP converte o array `fotos_novas[]` em uma estrutura diferente para múltiplos uploads
        if (isset($_FILES['fotos_novas'])) {
            $files_array = $_FILES['fotos_novas'];
            
            // Loop para iterar sobre os múltiplos arquivos enviados
            for ($i = 0; $i < count($files_array['name']); $i++) {
                if ($files_array['error'][$i] === UPLOAD_ERR_OK) {
                    
                    $nome_original = $files_array['name'][$i];
                    $tmp_name = $files_array['tmp_name'][$i];
                    $extensao = pathinfo($nome_original, PATHINFO_EXTENSION);
                    
                    // Cria um nome de arquivo único
                    $nome_arquivo_unico = 'orc_' . $orcamento_id . '_' . uniqid() . '.' . strtolower($extensao);
                    $destino = $upload_dir . $nome_arquivo_unico;

                    if (move_uploaded_file($tmp_name, $destino)) {
                        $caminho_db = 'uploads/' . $nome_arquivo_unico;
                        $fotos_salvas[] = [
                            'caminho' => $caminho_db,
                            'nome_arquivo' => $nome_original
                        ];
                        error_log("✅ Foto #" . ($i + 1) . " movida. Caminho DB: " . $caminho_db);
                    } else {
                        error_log("❌ ERRO: Falha ao mover arquivo de upload para: " . $destino);
                    }
                }
            }
        }

        // 2. Gerenciar fotos existentes (Remover as que foram excluídas no frontend)
        $fotos_existentes_ids = json_decode($data["fotos_existentes"] ?? '[]', true) ?: [];

        // DELETE: Fotos existentes no DB, mas que NÃO estão na lista 'fotos_existentes' enviada
        if (!empty($fotos_existentes_ids)) {
            $placeholders = implode(',', array_fill(0, count($fotos_existentes_ids), '?'));
            $sql_delete_antigas = "DELETE FROM orcamentos_fotos WHERE orcamento_id = ? AND id NOT IN ({$placeholders})";
            $params_delete_antigas = array_merge([$orcamento_id], $fotos_existentes_ids);
            
            $stmt_delete_antigas = $pdo->prepare($sql_delete_antigas);
            $stmt_delete_antigas->execute($params_delete_antigas);
        } else {
             // Se nenhuma foto existente foi enviada, deletar todas as antigas
             $pdo->prepare("DELETE FROM orcamentos_fotos WHERE orcamento_id = ?")->execute([$orcamento_id]);
        }


        // 3. Inserir as novas fotos salvas no banco de dados
        $stmt_insert_foto = $pdo->prepare("
            INSERT INTO orcamentos_fotos (orcamento_id, caminho, nome_arquivo, criado_em)
            VALUES (:orcamento_id, :caminho, :nome_arquivo, NOW())
        ");
        foreach ($fotos_salvas as $foto) {
            $stmt_insert_foto->execute([
                ':orcamento_id' => $orcamento_id,
                ':caminho' => $foto['caminho'],
                ':nome_arquivo' => $foto['nome_arquivo']
            ]);
        }

        // =======================================================
        // 🚨 FIM DO BLOCO DE FOTO
        // =======================================================

        // ✅ Validação do cliente (MANTIDA)
        $validacao_cliente = validarCliente($data["cliente_id"] ?? null, $pdo);
        if (!$validacao_cliente["valido"]) {
            // Se estiver usando RequestCache, adicione aqui o RequestCache::releaseRequest($request_id);
            responderErro($validacao_cliente["erro"], 400);
        }

        $cliente_id = $validacao_cliente["cliente_id"];
        $cliente_info = $validacao_cliente["cliente"];

        // 4. Update da Tabela Principal de Orçamentos (MANTIDA, SEM CAMPO 'caminho_foto')
        $sql_update = "
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
        ";
        
        $params = [
            ':cliente_id' => $cliente_id,
            ':usuario_id' => $data["usuario_id"] ?? 1, // Ajuste se tiver login
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
        ];

        $stmt = $pdo->prepare($sql_update);
        $stmt->execute($params);

        // 5. Regravar Serviços e Materiais (MANTIDO)
        $servicos_json = $data["servicos"] ?? '[]';
        $materiais_json = $data["materiais"] ?? '[]';
        $servicos_data = json_decode($servicos_json, true) ?: [];
        $materiais_data = json_decode($materiais_json, true) ?: [];
        
        // Limpeza dos itens antigos
        $pdo->prepare("DELETE FROM orcamentos_itens WHERE orcamento_id = ?")->execute([$orcamento_id]);

        // Regravar serviços 
        $stmtServico = $pdo->prepare("
            INSERT INTO orcamentos_itens
            (orcamento_id, tipo_item, descricao, tipo_especifico, observacao, quantidade, valor_unitario, valor_total, criado_em)
            VALUES
            (:orcamento_id, 'Servico', :descricao, :tipo_especifico, :observacao, :quantidade, :valor_unitario, :valor_total, NOW())
        ");
        foreach ($servicos_data as $servico) {
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

        // Regravar materiais
        $stmtMaterial = $pdo->prepare("
            INSERT INTO orcamentos_itens
            (orcamento_id, tipo_item, descricao, tipo_especifico, observacao, quantidade, valor_unitario, valor_total, criado_em)
            VALUES
            (:orcamento_id, 'Material', :descricao, :tipo_especifico, :observacao, :quantidade, :valor_unitario, :valor_total, NOW())
        ");
        foreach ($materiais_data as $material) {
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

        error_log("🎉 SUCESSO PUT ORCAMENTO - ID: " . $orcamento_id . ". Fotos salvas: " . count($fotos_salvas));
        responderSucesso("Orçamento e fotos atualizados com sucesso", [
            "id" => $orcamento_id,
            "cliente_nome" => $cliente_info['nome']
        ]);

    } catch (Exception $e) {
        error_log("❌ ERRO GERAL NO PUT: " . $e->getMessage());
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
