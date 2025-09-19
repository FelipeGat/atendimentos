<?php
// Headers CORS mais permissivos - DEVE ser a primeira coisa no arquivo
header("Access-Control-Allow-Origin: *");
header("Access-Control-Allow-Methods: GET, POST, PUT, DELETE, OPTIONS");
header("Access-Control-Allow-Headers: Content-Type, Authorization, X-Requested-With, X-Empresa-ID");
header("Access-Control-Max-Age: 86400");
header("Content-Type: application/json; charset=UTF-8");

// Tratar requisições OPTIONS (preflight)
if ($_SERVER["REQUEST_METHOD"] === "OPTIONS") {
    http_response_code(200);
    exit();
}

// Incluir arquivos de configuração e classes
require_once __DIR__ . "/../config/cors.php";
require_once __DIR__ . "/../config/db.php";
require_once "Orcamento.php";

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

$empresa_id = obterEmpresaId();
if (!$empresa_id) {
    responderErro("ID da empresa não fornecido no cabeçalho X-Empresa-ID", 400);
}

$request_method = $_SERVER["REQUEST_METHOD"];

switch ($request_method) {
    case 'GET':
        if (isset($_GET["action"]) && $_GET["action"] == "kpis") {
            try {
                $kpis_data = $orcamento->readKpis($empresa_id);
                responderSucesso("KPIs obtidos com sucesso", $kpis_data);
            } catch (Exception $e) {
                responderErro("Erro ao obter KPIs: " . $e->getMessage(), 500);
            }
        } else if (isset($_GET["id"])) {
            try {
                $orcamento->id = $_GET["id"];
                $orcamento->readOne();

                if ($orcamento->numero_orcamento != null) {
                    $orcamento_arr = array(
                        "id" => $orcamento->id,
                        "numero_orcamento" => $orcamento->numero_orcamento,
                        "empresa_id" => $orcamento->empresa_id,
                        "cliente_id" => $orcamento->cliente_id,
                        "usuario_id" => $orcamento->usuario_id,
                        "referencia" => $orcamento->referencia,
                        "data_orcamento" => $orcamento->data_orcamento,
                        "validade_orcamento" => $orcamento->validade_orcamento,
                        "prazo_inicio" => $orcamento->prazo_inicio,
                        "prazo_duracao" => $orcamento->prazo_duracao,
                        "observacoes" => $orcamento->observacoes,
                        "imposto_percentual" => $orcamento->imposto_percentual,
                        "frete" => $orcamento->frete,
                        "desconto_valor" => $orcamento->desconto_valor,
                        "desconto_percentual" => $orcamento->desconto_percentual,
                        "tipo_desconto" => $orcamento->tipo_desconto,
                        "condicoes_pagamento" => $orcamento->condicoes_pagamento,
                        "meios_pagamento" => $orcamento->meios_pagamento,
                        "anotacoes_internas" => $orcamento->anotacoes_internas,
                        "valor_total" => $orcamento->valor_total,
                        "status" => $orcamento->status,
                        "criado_em" => $orcamento->criado_em,
                        "atualizado_em" => $orcamento->atualizado_em,
                        "removido_em" => $orcamento->removido_em,
                        "empresa_nome" => $orcamento->empresa_nome,
                        "cliente_nome" => $orcamento->cliente_nome,
                        "servicos" => $orcamento->servicos ?? [],
                        "materiais" => $orcamento->materiais ?? []
                    );

                    responderSucesso("Orçamento encontrado", $orcamento_arr);
                } else {
                    responderErro("Orçamento não encontrado", 404);
                }
            } catch (Exception $e) {
                responderErro("Erro ao buscar orçamento: " . $e->getMessage(), 500);
            }
        } else {
            try {
                $search = isset($_GET["search"]) ? $_GET["search"] : "";
                $status = isset($_GET["status"]) ? $_GET["status"] : "";
                $cliente_id = isset($_GET["cliente_id"]) ? $_GET["cliente_id"] : "";
                $start_date = isset($_GET["start_date"]) ? $_GET["start_date"] : "";
                $end_date = isset($_GET["end_date"]) ? $_GET["end_date"] : "";
                $page = isset($_GET["page"]) ? (int)$_GET["page"] : 1;
                $limit = isset($_GET["limit"]) ? (int)$_GET["limit"] : 10;
                $offset = ($page - 1) * $limit;

                $stmt = $orcamento->readAllWithPagination($empresa_id, $search, $status, $cliente_id, $start_date, $end_date, $offset, $limit);
                $num = $stmt->rowCount();

                $orcamentos_arr = [];
                if ($num > 0) {
                    while ($row = $stmt->fetch(PDO::FETCH_ASSOC)) {
                        $orcamentos_arr[] = $row;
                    }
                }

                $total_rows = $orcamento->countAll($empresa_id, $search, $status, $cliente_id, $start_date, $end_date);

                responderSucesso("Orçamentos encontrados", [
                    "data" => $orcamentos_arr,
                    "total_records" => $total_rows,
                    "current_page" => $page,
                    "total_pages" => ceil($total_rows / $limit)
                ]);
            } catch (Exception $e) {
                responderErro("Erro ao listar orçamentos: " . $e->getMessage(), 500);
            }
        }
        break;

    case 'POST':
        try {
            // Tenta decodificar JSON. Se falhar, usa $_POST.
            $data = json_decode(file_get_contents("php://input"), true);
            if (!$data) {
                $data = $_POST;
            }

            if (empty($data["cliente_id"])) {
                responderErro("Cliente é obrigatório", 400);
            }

            try {
                $stmt_cliente = $pdo->prepare("SELECT id FROM clientes WHERE id = ? AND removido_em IS NULL");
                $stmt_cliente->execute([$data["cliente_id"]]);
                if (!$stmt_cliente->fetch()) {
                    responderErro("Cliente selecionado não existe ou foi removido", 400);
                }
            } catch (Exception $e) {
                responderErro("Erro ao validar cliente: " . $e->getMessage(), 500);
            }

            $orcamento->empresa_id = $empresa_id;
            $orcamento->cliente_id = $data["cliente_id"];
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
            $orcamento->status = $data["status"] ?? "rascunho";

            if (empty($data["numero_orcamento"])) {
                $orcamento->numero_orcamento = $orcamento->getNextNumeroOrcamento($empresa_id);
            } else {
                $orcamento->numero_orcamento = $data["numero_orcamento"];
            }

            if ($orcamento->create()) {
                // Processar itens (serviços e materiais)
                // Usar a mesma lógica para JSON ou FormData
                $servicos = isset($data["servicos"]) ? json_decode($data["servicos"], true) : [];
                $materiais = isset($data["materiais"]) ? json_decode($data["materiais"], true) : [];

                foreach ($servicos as $servico_data) {
                    $orcamento->createItem(array_merge($servico_data, ["orcamento_id" => $orcamento->id, "tipo_item" => "Servico"]));
                }
                foreach ($materiais as $material_data) {
                    $orcamento->createItem(array_merge($material_data, ["orcamento_id" => $orcamento->id, "tipo_item" => "Material"]));
                }

                // Processar upload de fotos
                if (isset($_FILES["fotos"])) {
                    $orcamento->savePhotos($orcamento->id, $_FILES);
                }

                responderSucesso("Orçamento criado com sucesso", ["id" => $orcamento->id, "numero_orcamento" => $orcamento->numero_orcamento]);
            } else {
                responderErro("Erro ao criar orçamento", 500);
            }
        } catch (Exception $e) {
            responderErro("Erro ao processar criação: " . $e->getMessage(), 500);
        }
        break;

    case 'PUT':
        try {
            if (!isset($_GET["id"])) {
                responderErro("ID do orçamento é obrigatório", 400);
            }

            $data = json_decode(file_get_contents("php://input"), true);
            if (!$data) {
                $data = $_POST;
            }

            $orcamento->id = $_GET["id"];
            $orcamento->empresa_id = $empresa_id;

            if (!empty($data["cliente_id"])) {
                try {
                    $stmt_cliente = $pdo->prepare("SELECT id FROM clientes WHERE id = ? AND removido_em IS NULL");
                    $stmt_cliente->execute([$data["cliente_id"]]);
                    if (!$stmt_cliente->fetch()) {
                        responderErro("Cliente selecionado não existe ou foi removido", 400);
                    }
                } catch (Exception $e) {
                    responderErro("Erro ao validar cliente: " . $e->getMessage(), 500);
                }
            }

            $orcamento->cliente_id = $data["cliente_id"] ?? null;
            $orcamento->usuario_id = $data["usuario_id"] ?? 1;
            $orcamento->numero_orcamento = $data["numero_orcamento"] ?? null;
            $orcamento->referencia = $data["referencia"] ?? null;
            $orcamento->data_orcamento = $data["data_orcamento"] ?? null;
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
            $orcamento->status = $data["status"] ?? "rascunho";

            if ($orcamento->update()) {
                // Processar itens (serviços e materiais)
                $servicos = isset($data["servicos"]) ? json_decode($data["servicos"], true) : [];
                $materiais = isset($data["materiais"]) ? json_decode($data["materiais"], true) : [];

                $orcamento->updateItems($orcamento->id, $servicos, "Servico");
                $orcamento->updateItems($orcamento->id, $materiais, "Material");

                if (isset($_FILES["fotos"])) {
                    $orcamento->savePhotos($orcamento->id, $_FILES);
                }

                responderSucesso("Orçamento atualizado com sucesso");
            } else {
                responderErro("Erro ao atualizar orçamento", 500);
            }
        } catch (Exception $e) {
            responderErro("Erro ao processar atualização: " . $e->getMessage(), 500);
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
            responderErro("Erro ao processar remoção: " . $e->getMessage(), 500);
        }
        break;

    default:
        responderErro("Método " . $request_method . " não permitido", 405);
        break;
}
?>