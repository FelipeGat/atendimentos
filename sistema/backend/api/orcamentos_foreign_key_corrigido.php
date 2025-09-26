<?php
/**
 * API de Orçamentos - Versão com Foreign Key Corrigida
 * Sistema de Gerenciamento de Atendimentos
 */

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

// Habilitar exibição de erros para debug
ini_set('display_errors', 1);
ini_set('display_startup_errors', 1);
error_reporting(E_ALL);

// Incluir configurações
require_once __DIR__ . "/../config/db.php";
require_once __DIR__ . "/../config/util.php";
require_once __DIR__ . "/Orcamento.php";

// Roteamento das requisições
$method = $_SERVER['REQUEST_METHOD'];
$id = $_GET['id'] ?? null;

switch ($method) {
    case 'GET':
        handleGet($conn, $id);
        break;

    case 'POST':
        handlePost($conn);
        break;

    case 'PUT':
        handlePut($conn, $id);
        break;

    case 'DELETE':
        handleDelete($conn, $id);
        break;

    default:
        responderErro('Método não permitido', 405);
        break;
}

/**
 * Listar orçamentos ou buscar por ID
 */
function handleGet($conn, $id) {
    try {
        if ($id) {
            // Buscar orçamento específico com itens
            $orcamento = new Orcamento($conn);
            $orcamento->id = $id;
            
            if ($orcamento->read()) {
                // Buscar itens do orçamento
                $servicos = $orcamento->getServicos();
                $materiais = $orcamento->getMateriais();
                
                $data = [
                    'orcamento' => $orcamento->toArray(),
                    'servicos' => $servicos,
                    'materiais' => $materiais
                ];
                
                responderSucesso('Orçamento encontrado', $data);
            } else {
                responderErro('Orçamento não encontrado', 404);
            }
        } else {
            // Listar todos os orçamentos
            $stmt = $conn->prepare("
                SELECT o.*, e.nome as empresa_nome, c.nome as cliente_nome
                FROM orcamentos o
                LEFT JOIN empresas e ON o.empresa_id = e.id
                LEFT JOIN clientes c ON o.cliente_id = c.id
                WHERE o.removido_em IS NULL
                ORDER BY o.id DESC
            ");
            
            if (!$stmt) {
                responderErro("Erro na preparação da consulta: " . $conn->error, 500);
            }
            
            $stmt->execute();
            $result = $stmt->get_result();
            $orcamentos = $result->fetch_all(MYSQLI_ASSOC);
            
            responderSucesso('Orçamentos listados com sucesso', $orcamentos);
        }
        
    } catch (Exception $e) {
        error_log("Erro ao buscar orçamentos: " . $e->getMessage());
        responderErro('Erro ao buscar orçamentos: ' . $e->getMessage(), 500);
    }
}

/**
 * Criar novo orçamento
 */
function handlePost($conn) {
    try {
        // Detectar tipo de conteúdo
        $contentType = $_SERVER['CONTENT_TYPE'] ?? '';
        
        if (strpos($contentType, 'multipart/form-data') !== false) {
            // FormData
            $data = $_POST;
            
            // Processar arrays JSON se existirem
            if (isset($data['servicos']) && is_string($data['servicos'])) {
                $data['servicos'] = json_decode($data['servicos'], true);
            }
            if (isset($data['materiais']) && is_string($data['materiais'])) {
                $data['materiais'] = json_decode($data['materiais'], true);
            }
        } else {
            // JSON
            $input = file_get_contents('php://input');
            $data = json_decode($input, true);
            
            if (json_last_error() !== JSON_ERROR_NONE) {
                responderErro('JSON inválido: ' . json_last_error_msg(), 400);
            }
        }

        if (!$data) {
            responderErro('Dados não fornecidos', 400);
        }

        // VALIDAÇÃO CRÍTICA: Verificar se empresa existe
        if (!isset($data['empresa_id']) || empty($data['empresa_id'])) {
            responderErro('ID da empresa é obrigatório', 400);
        }

        $empresa_id = (int)$data['empresa_id'];
        
        // Verificar se a empresa existe e está ativa
        $stmt = $conn->prepare("SELECT id, nome FROM empresas WHERE id = ? AND ativo = 1 AND removido_em IS NULL");
        if (!$stmt) {
            responderErro("Erro na preparação da consulta: " . $conn->error, 500);
        }
        
        $stmt->bind_param("i", $empresa_id);
        $stmt->execute();
        $result = $stmt->get_result();
        
        if ($result->num_rows === 0) {
            responderErro('Empresa não encontrada ou inativa. Verifique se a empresa existe e está ativa.', 400);
        }
        
        $empresa = $result->fetch_assoc();

        // VALIDAÇÃO: Verificar se cliente existe (se fornecido)
        if (isset($data['cliente_id']) && !empty($data['cliente_id'])) {
            $cliente_id = (int)$data['cliente_id'];
            
            $stmt = $conn->prepare("SELECT id, nome FROM clientes WHERE id = ? AND ativo = 1 AND removido_em IS NULL");
            if (!$stmt) {
                responderErro("Erro na preparação da consulta: " . $conn->error, 500);
            }
            
            $stmt->bind_param("i", $cliente_id);
            $stmt->execute();
            $result = $stmt->get_result();
            
            if ($result->num_rows === 0) {
                responderErro('Cliente não encontrado ou inativo. Verifique se o cliente existe e está ativo.', 400);
            }
        }

        // Criar orçamento
        $orcamento = new Orcamento($conn);
        
        // Definir dados básicos
        $orcamento->empresa_id = $empresa_id;
        $orcamento->cliente_id = isset($data['cliente_id']) ? (int)$data['cliente_id'] : null;
        $orcamento->referencia = $data['referencia'] ?? '';
        $orcamento->data_orcamento = $data['data_orcamento'] ?? date('Y-m-d');
        $orcamento->validade_orcamento = $data['validade_orcamento'] ?? date('Y-m-d', strtotime('+30 days'));
        $orcamento->observacoes = $data['observacoes'] ?? '';
        $orcamento->condicoes_pagamento = $data['condicoes_pagamento'] ?? '';
        $orcamento->meios_pagamento = $data['meios_pagamento'] ?? '';
        $orcamento->anotacoes_internas = $data['anotacoes_internas'] ?? '';
        $orcamento->status = $data['status'] ?? 'rascunho';

        // Criar orçamento
        if ($orcamento->create()) {
            // Adicionar serviços se fornecidos
            if (isset($data['servicos']) && is_array($data['servicos'])) {
                foreach ($data['servicos'] as $servico) {
                    if (!empty($servico['descricao'])) {
                        $orcamento->createItem($servico);
                    }
                }
            }

            // Adicionar materiais se fornecidos
            if (isset($data['materiais']) && is_array($data['materiais'])) {
                foreach ($data['materiais'] as $material) {
                    if (!empty($material['descricao'])) {
                        $orcamento->createItem($material);
                    }
                }
            }

            // Recalcular totais
            $orcamento->calculateTotals();

            responderSucesso('Orçamento criado com sucesso', [
                'id' => $orcamento->id,
                'numero_orcamento' => $orcamento->numero_orcamento,
                'empresa' => $empresa['nome'],
                'valor_total' => $orcamento->valor_total
            ], 201);
        } else {
            responderErro('Erro ao criar orçamento', 500);
        }

    } catch (Exception $e) {
        error_log("Erro ao processar criação: " . $e->getMessage());
        responderErro('Erro ao processar criação: ' . $e->getMessage(), 500);
    }
}

/**
 * Atualizar orçamento
 */
function handlePut($conn, $id) {
    try {
        if (!$id) {
            responderErro('ID do orçamento é obrigatório', 400);
        }

        $input = file_get_contents('php://input');
        $data = json_decode($input, true);

        if (json_last_error() !== JSON_ERROR_NONE) {
            responderErro('JSON inválido: ' . json_last_error_msg(), 400);
        }

        if (!$data) {
            responderErro('Dados não fornecidos', 400);
        }

        // Verificar se orçamento existe
        $orcamento = new Orcamento($conn);
        $orcamento->id = $id;

        if (!$orcamento->read()) {
            responderErro('Orçamento não encontrado', 404);
        }

        // VALIDAÇÃO: Verificar empresa se fornecida
        if (isset($data['empresa_id']) && !empty($data['empresa_id'])) {
            $empresa_id = (int)$data['empresa_id'];
            
            $stmt = $conn->prepare("SELECT id FROM empresas WHERE id = ? AND ativo = 1 AND removido_em IS NULL");
            if (!$stmt) {
                responderErro("Erro na preparação da consulta: " . $conn->error, 500);
            }
            
            $stmt->bind_param("i", $empresa_id);
            $stmt->execute();
            $result = $stmt->get_result();
            
            if ($result->num_rows === 0) {
                responderErro('Empresa não encontrada ou inativa', 400);
            }
            
            $orcamento->empresa_id = $empresa_id;
        }

        // VALIDAÇÃO: Verificar cliente se fornecido
        if (isset($data['cliente_id']) && !empty($data['cliente_id'])) {
            $cliente_id = (int)$data['cliente_id'];
            
            $stmt = $conn->prepare("SELECT id FROM clientes WHERE id = ? AND ativo = 1 AND removido_em IS NULL");
            if (!$stmt) {
                responderErro("Erro na preparação da consulta: " . $conn->error, 500);
            }
            
            $stmt->bind_param("i", $cliente_id);
            $stmt->execute();
            $result = $stmt->get_result();
            
            if ($result->num_rows === 0) {
                responderErro('Cliente não encontrado ou inativo', 400);
            }
            
            $orcamento->cliente_id = $cliente_id;
        }

        // Atualizar outros campos
        if (isset($data['referencia'])) $orcamento->referencia = $data['referencia'];
        if (isset($data['data_orcamento'])) $orcamento->data_orcamento = $data['data_orcamento'];
        if (isset($data['validade_orcamento'])) $orcamento->validade_orcamento = $data['validade_orcamento'];
        if (isset($data['observacoes'])) $orcamento->observacoes = $data['observacoes'];
        if (isset($data['condicoes_pagamento'])) $orcamento->condicoes_pagamento = $data['condicoes_pagamento'];
        if (isset($data['meios_pagamento'])) $orcamento->meios_pagamento = $data['meios_pagamento'];
        if (isset($data['anotacoes_internas'])) $orcamento->anotacoes_internas = $data['anotacoes_internas'];
        if (isset($data['status'])) $orcamento->status = $data['status'];

        if ($orcamento->update()) {
            // Atualizar itens se fornecidos
            if (isset($data['servicos']) || isset($data['materiais'])) {
                // Remover itens existentes
                $orcamento->deleteAllItems();

                // Adicionar novos serviços
                if (isset($data['servicos']) && is_array($data['servicos'])) {
                    foreach ($data['servicos'] as $servico) {
                        if (!empty($servico['descricao'])) {
                            $orcamento->createItem($servico);
                        }
                    }
                }

                // Adicionar novos materiais
                if (isset($data['materiais']) && is_array($data['materiais'])) {
                    foreach ($data['materiais'] as $material) {
                        if (!empty($material['descricao'])) {
                            $orcamento->createItem($material);
                        }
                    }
                }

                // Recalcular totais
                $orcamento->calculateTotals();
            }

            responderSucesso('Orçamento atualizado com sucesso');
        } else {
            responderErro('Erro ao atualizar orçamento', 500);
        }

    } catch (Exception $e) {
        error_log("Erro ao atualizar orçamento: " . $e->getMessage());
        responderErro('Erro ao atualizar orçamento: ' . $e->getMessage(), 500);
    }
}

/**
 * Excluir orçamento
 */
function handleDelete($conn, $id) {
    try {
        if (!$id) {
            responderErro('ID do orçamento é obrigatório', 400);
        }

        $orcamento = new Orcamento($conn);
        $orcamento->id = $id;

        if (!$orcamento->read()) {
            responderErro('Orçamento não encontrado', 404);
        }

        if ($orcamento->delete()) {
            responderSucesso('Orçamento excluído com sucesso');
        } else {
            responderErro('Erro ao excluir orçamento', 500);
        }

    } catch (Exception $e) {
        error_log("Erro ao excluir orçamento: " . $e->getMessage());
        responderErro('Erro ao excluir orçamento: ' . $e->getMessage(), 500);
    }
}
?>

