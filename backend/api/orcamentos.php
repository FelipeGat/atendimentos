<?php
header("Access-Control-Allow-Origin: *");
header("Content-Type: application/json; charset=UTF-8");
header("Access-Control-Allow-Methods: GET, POST, PUT, DELETE");
header("Access-Control-Max-Age: 3600");
header("Access-Control-Allow-Headers: Content-Type, Access-Control-Allow-Headers, Authorization, X-Requested-With, X-Empresa-ID");

include_once(__DIR__ . "/../config/db.php");
include_once("Orcamento.php");

$caminho_db = __DIR__ . "/../config/db.php";
echo "Verificando o caminho: " . $caminho_db . "<br>";
if (file_exists($caminho_db)) {
    echo "Sucesso: O arquivo db.php foi encontrado. <br>";
} else {
    echo "Erro: O arquivo db.php NÃO foi encontrado. <br>";
}

$database = new Database();
$db = $database->getConnection();

$orcamento = new Orcamento($db);

$request_method = $_SERVER["REQUEST_METHOD"];

switch($request_method) {
    case 'GET':
        if (isset($_GET["action"]) && $_GET["action"] == "kpis") {
    $kpis_data = $orcamento->readKpis();

    if (!empty($kpis_data)) {
        http_response_code(200);
        echo json_encode(array("success" => true, "data" => $kpis_data));
    } else {
        http_response_code(200);
        echo json_encode(array("success" => true, "data" => new stdClass()));
    }
} else if (isset($_GET["id"])) {
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
                    "itens" => $orcamento->readItems()
                );
                http_response_code(200);
                echo json_encode(array("success" => true, "data" => $orcamento_arr));
            } else {
                http_response_code(404);
                echo json_encode(array("success" => false, "message" => "Orçamento não encontrado."));
            }
        } else {
            $filterStatus = isset($_GET["status"]) ? $_GET["status"] : "";
            $filterStartDate = isset($_GET["start_date"]) ? $_GET["start_date"] : "";
            $filterEndDate = isset($_GET["end_date"]) ? $_GET["end_date"] : "";

            $stmt = $orcamento->read($filterStatus, $filterStartDate, $filterEndDate);
            $num = $stmt->rowCount();

            if ($num > 0) {
                $orcamentos_arr = array();
                while ($row = $stmt->fetch(PDO::FETCH_ASSOC)) {
                    extract($row);
                    $orcamento_item = array(
                        "id" => $id,
                        "numero_orcamento" => $numero_orcamento,
                        "empresa_id" => $empresa_id,
                        "cliente_id" => $cliente_id,
                        "usuario_id" => $usuario_id,
                        "referencia" => $referencia,
                        "data_orcamento" => $data_orcamento,
                        "validade_orcamento" => $validade_orcamento,
                        "prazo_inicio" => $prazo_inicio,
                        "prazo_duracao" => $prazo_duracao,
                        "observacoes" => $observacoes,
                        "imposto_percentual" => $imposto_percentual,
                        "frete" => $frete,
                        "desconto_valor" => $desconto_valor,
                        "desconto_percentual" => $desconto_percentual,
                        "tipo_desconto" => $tipo_desconto,
                        "condicoes_pagamento" => $condicoes_pagamento,
                        "meios_pagamento" => $meios_pagamento,
                        "anotacoes_internas" => $anotacoes_internas,
                        "valor_total" => $valor_total,
                        "status" => $status,
                        "criado_em" => $criado_em,
                        "atualizado_em" => $atualizado_em,
                        "removido_em" => $removido_em,
                        "empresa_nome" => $empresa_nome,
                        "cliente_nome" => $cliente_nome
                    );
                    array_push($orcamentos_arr, $orcamento_item);
                }
                http_response_code(200);
                echo json_encode(array("success" => true, "data" => $orcamentos_arr));
            } else {
                http_response_code(200);
                echo json_encode(array("success" => true, "message" => "Nenhum orçamento encontrado.", "data" => array()));
            }
        }
        break;
    case 'POST':
        $data = json_decode(file_get_contents("php://input"));

        if (
            !empty($data->empresa_id) &&
            !empty($data->cliente_id) &&
            !empty($data->usuario_id) &&
            !empty($data->data_orcamento) &&
            !empty($data->valor_total) &&
            !empty($data->itens)
        ) {
            $orcamento->numero_orcamento = $data->numero_orcamento ?? null; // Pode ser gerado pelo banco
            $orcamento->empresa_id = $data->empresa_id;
            $orcamento->cliente_id = $data->cliente_id;
            $orcamento->usuario_id = $data->usuario_id;
            $orcamento->referencia = $data->referencia ?? null;
            $orcamento->data_orcamento = $data->data_orcamento;
            $orcamento->validade_orcamento = $data->validade_orcamento ?? null;
            $orcamento->prazo_inicio = $data->prazo_inicio ?? null;
            $orcamento->prazo_duracao = $data->prazo_duracao ?? null;
            $orcamento->observacoes = $data->observacoes ?? null;
            $orcamento->imposto_percentual = $data->imposto_percentual ?? 0;
            $orcamento->frete = $data->frete ?? 0;
            $orcamento->desconto_valor = $data->desconto_valor ?? 0;
            $orcamento->desconto_percentual = $data->desconto_percentual ?? 0;
            $orcamento->tipo_desconto = $data->tipo_desconto ?? 'valor_total';
            $orcamento->condicoes_pagamento = $data->condicoes_pagamento ?? null;
            $orcamento->meios_pagamento = $data->meios_pagamento ?? null;
            $orcamento->anotacoes_internas = $data->anotacoes_internas ?? null;
            $orcamento->valor_total = $data->valor_total;
            $orcamento->status = $data->status ?? 'Pendente';

            if ($orcamento->create()) {
                // Salvar itens do orçamento
                foreach ($data->itens as $item_data) {
                    $item = new stdClass(); // Objeto genérico para o item
                    $item->orcamento_id = $orcamento->id;
                    $item->tipo_item = $item_data->tipo_item;
                    $item->descricao = $item_data->descricao;
                    $item->tipo_especifico = $item_data->tipo_especifico ?? null;
                    $item->observacao = $item_data->observacao ?? null;
                    $item->quantidade = $item_data->quantidade;
                    $item->valor_unitario = $item_data->valor_unitario;
                    $item->valor_total = $item_data->valor_total;

                    if (!$orcamento->createItem($item)) {
                        // Se um item falhar, você pode querer reverter o orçamento ou logar o erro
                        http_response_code(503);
                        echo json_encode(array("success" => false, "message" => "Não foi possível criar o item do orçamento."));
                        return;
                    }
                }
                http_response_code(201);
                echo json_encode(array("success" => true, "message" => "Orçamento criado com sucesso.", "id" => $orcamento->id));
            } else {
                http_response_code(503);
                echo json_encode(array("success" => false, "message" => "Não foi possível criar o orçamento."));
            }
        } else {
            http_response_code(400);
            echo json_encode(array("success" => false, "message" => "Dados incompletos. Verifique empresa_id, cliente_id, usuario_id, data_orcamento, valor_total e itens."));
        }
        break;
    case 'PUT':
        $data = json_decode(file_get_contents("php://input"));

        if (
            !empty($data->id) &&
            !empty($data->empresa_id) &&
            !empty($data->cliente_id) &&
            !empty($data->usuario_id) &&
            !empty($data->data_orcamento) &&
            !empty($data->valor_total) &&
            !empty($data->itens)
        ) {
            $orcamento->id = $data->id;
            $orcamento->numero_orcamento = $data->numero_orcamento ?? null;
            $orcamento->empresa_id = $data->empresa_id;
            $orcamento->cliente_id = $data->cliente_id;
            $orcamento->usuario_id = $data->usuario_id;
            $orcamento->referencia = $data->referencia ?? null;
            $orcamento->data_orcamento = $data->data_orcamento;
            $orcamento->validade_orcamento = $data->validade_orcamento ?? null;
            $orcamento->prazo_inicio = $data->prazo_inicio ?? null;
            $orcamento->prazo_duracao = $data->prazo_duracao ?? null;
            $orcamento->observacoes = $data->observacoes ?? null;
            $orcamento->imposto_percentual = $data->imposto_percentual ?? 0;
            $orcamento->frete = $data->frete ?? 0;
            $orcamento->desconto_valor = $data->desconto_valor ?? 0;
            $orcamento->desconto_percentual = $data->desconto_percentual ?? 0;
            $orcamento->tipo_desconto = $data->tipo_desconto ?? 'valor_total';
            $orcamento->condicoes_pagamento = $data->condicoes_pagamento ?? null;
            $orcamento->meios_pagamento = $data->meios_pagamento ?? null;
            $orcamento->anotacoes_internas = $data->anotacoes_internas ?? null;
            $orcamento->valor_total = $data->valor_total;
            $orcamento->status = $data->status ?? 'Pendente';

            if ($orcamento->update()) {
                // Excluir itens existentes e inserir os novos
                $orcamento->deleteItemsByOrcamentoId($orcamento->id);
                foreach ($data->itens as $item_data) {
                    $item = new stdClass();
                    $item->orcamento_id = $orcamento->id;
                    $item->tipo_item = $item_data->tipo_item;
                    $item->descricao = $item_data->descricao;
                    $item->tipo_especifico = $item_data->tipo_especifico ?? null;
                    $item->observacao = $item_data->observacao ?? null;
                    $item->quantidade = $item_data->quantidade;
                    $item->valor_unitario = $item_data->valor_unitario;
                    $item->valor_total = $item_data->valor_total;

                    if (!$orcamento->createItem($item)) {
                        http_response_code(503);
                        echo json_encode(array("success" => false, "message" => "Não foi possível atualizar os itens do orçamento."));
                        return;
                    }
                }
                http_response_code(200);
                echo json_encode(array("success" => true, "message" => "Orçamento atualizado com sucesso."));
            } else {
                http_response_code(503);
                echo json_encode(array("success" => false, "message" => "Não foi possível atualizar o orçamento."));
            }
        } else {
            http_response_code(400);
            echo json_encode(array("success" => false, "message" => "Dados incompletos para atualização. Verifique id, empresa_id, cliente_id, usuario_id, data_orcamento, valor_total e itens."));
        }
        break;
    case 'DELETE':
        $data = json_decode(file_get_contents("php://input"));

        if (!empty($data->id)) {
            $orcamento->id = $data->id;

            if ($orcamento->delete()) {
                http_response_code(200);
                echo json_encode(array("success" => true, "message" => "Orçamento excluído com sucesso."));
            } else {
                http_response_code(503);
                echo json_encode(array("success" => false, "message" => "Não foi possível excluir o orçamento."));
            }
        } else {
            http_response_code(400);
            echo json_encode(array("success" => false, "message" => "ID do orçamento não fornecido."));
        }
        break;
    default:
        http_response_code(405);
        echo json_encode(array("message" => "Método não permitido."));
        break;
}

?>

