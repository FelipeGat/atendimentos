<?php
// Headers CORS mais permissivos - DEVE ser a primeira coisa no arquivo
header("Access-Control-Allow-Origin: *");
header("Access-Control-Allow-Methods: GET, POST, PUT, DELETE, OPTIONS");
header("Access-Control-Allow-Headers: Content-Type, Authorization, X-Requested-With, X-Empresa-ID");
header("Access-Control-Max-Age: 86400");
header("Content-Type: application/json; charset=UTF-8");

// Tratar requisições OPTIONS (preflight)
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit();
}

// Incluir arquivos de configuração (mantendo compatibilidade)
include_once(__DIR__ . "/../config/db.php");
include_once("Orcamento.php");

// Verificar se a conexão MySQLi foi estabelecida
if (!isset($conn) || $conn->connect_error) {
    responderErro("Erro de conexão MySQLi com banco de dados", 500);
}

// Tentar criar instância da classe Orcamento
$orcamento = null;
try {
    $pdo_conn = getConnection();
    if ($pdo_conn) {
        $orcamento = new Orcamento($pdo_conn);
    } else {
        responderErro("Erro ao estabelecer conexão PDO para orçamentos", 500);
    }
} catch (Exception $e) {
    responderErro("Erro ao inicializar classe Orcamento: " . $e->getMessage(), 500);
}

$request_method = $_SERVER["REQUEST_METHOD"];

switch($request_method) {
    case 'GET':
        if (isset($_GET["action"]) && $_GET["action"] == "kpis") {
            try {
                $kpis_data = $orcamento->readKpis();
                if (!empty($kpis_data)) {
                    responderSucesso("KPIs obtidos com sucesso", $kpis_data);
                } else {
                    responderSucesso("KPIs obtidos com sucesso", new stdClass());
                }
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
                        "itens" => $orcamento->readItems()
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
                    responderSucesso("Orçamentos encontrados", $orcamentos_arr);
                } else {
                    responderSucesso("Nenhum orçamento encontrado", []);
                }
            } catch (Exception $e) {
                responderErro("Erro ao listar orçamentos: " . $e->getMessage(), 500);
            }
        }
        break;

    case 'POST':
        try {
            // Verificar se é FormData (multipart) ou JSON
            $contentType = $_SERVER['CONTENT_TYPE'] ?? '';
            
            if (strpos($contentType, 'multipart/form-data') !== false) {
                // Dados vêm do FormData
                $data = $_POST;
                
                // Processar arrays JSON se existirem
                if (isset($data['servicos']) && is_string($data['servicos'])) {
                    $data['servicos'] = json_decode($data['servicos'], true);
                }
                if (isset($data['materiais']) && is_string($data['materiais'])) {
                    $data['materiais'] = json_decode($data['materiais'], true);
                }
            } else {
                // Dados vêm como JSON
                $input = file_get_contents("php://input");
                $data = json_decode($input, true);
                
                if (!$data && !empty($_POST)) {
                    $data = $_POST;
                }
                
                if (!$data) {
                    responderErro("Dados não recebidos ou formato inválido", 400);
                }
            }

            // Log para debug (remover em produção)
            error_log("Dados recebidos: " . print_r($data, true));

            // Validar dados obrigatórios
            if (empty($data['empresa_id']) || empty($data['cliente_id'])) {
                responderErro("Empresa e Cliente são obrigatórios", 400);
            }

            // Definir propriedades do orçamento
            $orcamento->numero_orcamento = $data['numero_orcamento'] ?? '';
            $orcamento->empresa_id = $data['empresa_id'];
            $orcamento->cliente_id = $data['cliente_id'];
            $orcamento->usuario_id = $data['usuario_id'] ?? 1;
            $orcamento->referencia = $data['referencia'] ?? '';
            $orcamento->data_orcamento = $data['data_orcamento'] ?? date('Y-m-d');
            $orcamento->validade_orcamento = $data['validade_orcamento'] ?? '';
            $orcamento->prazo_inicio = $data['prazo_inicio'] ?? '';
            $orcamento->prazo_duracao = $data['prazo_duracao'] ?? '';
            $orcamento->observacoes = $data['observacoes'] ?? '';
            $orcamento->imposto_percentual = $data['imposto_percentual'] ?? 0;
            $orcamento->frete = $data['frete'] ?? 0;
            $orcamento->desconto_valor = $data['desconto_valor'] ?? 0;
            $orcamento->desconto_percentual = $data['desconto_percentual'] ?? 0;
            $orcamento->tipo_desconto = $data['tipo_desconto'] ?? 'valor';
            $orcamento->condicoes_pagamento = $data['condicoes_pagamento'] ?? '';
            $orcamento->meios_pagamento = $data['meios_pagamento'] ?? '';
            $orcamento->anotacoes_internas = $data['anotacoes_internas'] ?? '';
            $orcamento->valor_total = $data['valor_total'] ?? 0;
            $orcamento->status = $data['status'] ?? 'Rascunho';

            if ($orcamento->create()) {
                // Processar itens se existirem
                if (isset($data['servicos']) && is_array($data['servicos'])) {
                    foreach ($data['servicos'] as $servico) {
                        if (!empty($servico['servico'])) {
                            $item = [
                                'tipo_item' => 'servico',
                                'descricao' => $servico['servico'],
                                'tipo_especifico' => 'servico',
                                'observacao' => $servico['detalhes'] ?? '',
                                'quantidade' => $servico['quantidade'] ?? 1,
                                'valor_unitario' => $servico['preco_unitario'] ?? 0,
                                'valor_total' => $servico['valor_total'] ?? 0
                            ];
                            $orcamento->createItem($item);
                        }
                    }
                }

                if (isset($data['materiais']) && is_array($data['materiais'])) {
                    foreach ($data['materiais'] as $material) {
                        if (!empty($material['material'])) {
                            $item = [
                                'tipo_item' => 'material',
                                'descricao' => $material['material'],
                                'tipo_especifico' => 'material',
                                'observacao' => $material['detalhes'] ?? '',
                                'quantidade' => $material['quantidade'] ?? 1,
                                'valor_unitario' => $material['preco_unitario'] ?? 0,
                                'valor_total' => $material['valor_total'] ?? 0
                            ];
                            $orcamento->createItem($item);
                        }
                    }
                }

                // Processar upload de fotos se existirem
                if (isset($_FILES) && !empty($_FILES)) {
                    // Aqui você pode implementar o upload de fotos
                    // Por enquanto, apenas registramos que existem arquivos
                }

                responderSucesso("Orçamento criado com sucesso", ["id" => $orcamento->id]);
            } else {
                responderErro("Erro ao criar orçamento", 500);
            }
        } catch (Exception $e) {
            responderErro("Erro ao processar criação: " . $e->getMessage(), 500);
        }
        break;

    case 'PUT':
        try {
            if (!isset($_GET['id'])) {
                responderErro("ID do orçamento é obrigatório", 400);
            }

            $input = file_get_contents("php://input");
            $data = json_decode($input, true);
            
            if (!$data && !empty($_POST)) {
                $data = $_POST;
            }
            
            if (!$data) {
                responderErro("Dados não recebidos ou formato inválido", 400);
            }

            $orcamento->id = $_GET['id'];
            $orcamento->numero_orcamento = $data['numero_orcamento'] ?? '';
            $orcamento->empresa_id = $data['empresa_id'];
            $orcamento->cliente_id = $data['cliente_id'];
            $orcamento->usuario_id = $data['usuario_id'] ?? 1;
            $orcamento->referencia = $data['referencia'] ?? '';
            $orcamento->data_orcamento = $data['data_orcamento'] ?? date('Y-m-d');
            $orcamento->validade_orcamento = $data['validade_orcamento'] ?? '';
            $orcamento->prazo_inicio = $data['prazo_inicio'] ?? '';
            $orcamento->prazo_duracao = $data['prazo_duracao'] ?? '';
            $orcamento->observacoes = $data['observacoes'] ?? '';
            $orcamento->imposto_percentual = $data['imposto_percentual'] ?? 0;
            $orcamento->frete = $data['frete'] ?? 0;
            $orcamento->desconto_valor = $data['desconto_valor'] ?? 0;
            $orcamento->desconto_percentual = $data['desconto_percentual'] ?? 0;
            $orcamento->tipo_desconto = $data['tipo_desconto'] ?? 'valor';
            $orcamento->condicoes_pagamento = $data['condicoes_pagamento'] ?? '';
            $orcamento->meios_pagamento = $data['meios_pagamento'] ?? '';
            $orcamento->anotacoes_internas = $data['anotacoes_internas'] ?? '';
            $orcamento->valor_total = $data['valor_total'] ?? 0;
            $orcamento->status = $data['status'] ?? 'Rascunho';

            if ($orcamento->update()) {
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
            if (!isset($_GET['id'])) {
                responderErro("ID do orçamento é obrigatório", 400);
            }

            $orcamento->id = $_GET['id'];
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

