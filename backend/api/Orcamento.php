<?php

class Orcamento {
    private $conn;
    private $table_name = "orcamentos";

    public $id;
    public $empresa_id;
    public $cliente_id;
    public $usuario_id;
    public $numero_orcamento;
    public $referencia;
    public $data_orcamento;
    public $validade_orcamento;
    public $prazo_inicio;
    public $prazo_duracao;
    public $observacoes;
    public $imposto_percentual;
    public $frete;
    public $desconto_valor;
    public $desconto_percentual;
    public $tipo_desconto;
    public $condicoes_pagamento;
    public $meios_pagamento;
    public $anotacoes_internas;
    public $valor_total;
    public $status;
    public $criado_em;
    public $atualizado_em;
    public $removido_em;

    public function __construct($db) {
        $this->conn = $db;
    }

    // Método para criar um novo orçamento
    public function create() {
        $query = "INSERT INTO " . $this->table_name . "
                SET
                    empresa_id = :empresa_id,
                    cliente_id = :cliente_id,
                    usuario_id = :usuario_id,
                    numero_orcamento = :numero_orcamento,
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
                    criado_em = NOW()";

        $stmt = $this->conn->prepare($query);

        // Limpar dados
        $this->empresa_id = htmlspecialchars(strip_tags($this->empresa_id));
        $this->cliente_id = htmlspecialchars(strip_tags($this->cliente_id));
        $this->usuario_id = htmlspecialchars(strip_tags($this->usuario_id));
        $this->numero_orcamento = htmlspecialchars(strip_tags($this->numero_orcamento));
        $this->referencia = htmlspecialchars(strip_tags($this->referencia));
        $this->data_orcamento = htmlspecialchars(strip_tags($this->data_orcamento));
        $this->validade_orcamento = htmlspecialchars(strip_tags($this->validade_orcamento));
        $this->prazo_inicio = htmlspecialchars(strip_tags($this->prazo_inicio));
        $this->prazo_duracao = htmlspecialchars(strip_tags($this->prazo_duracao));
        $this->observacoes = htmlspecialchars(strip_tags($this->observacoes));
        $this->imposto_percentual = htmlspecialchars(strip_tags($this->imposto_percentual));
        $this->frete = htmlspecialchars(strip_tags($this->frete));
        $this->desconto_valor = htmlspecialchars(strip_tags($this->desconto_valor));
        $this->desconto_percentual = htmlspecialchars(strip_tags($this->desconto_percentual));
        $this->tipo_desconto = htmlspecialchars(strip_tags($this->tipo_desconto));
        $this->condicoes_pagamento = htmlspecialchars(strip_tags($this->condicoes_pagamento));
        $this->meios_pagamento = htmlspecialchars(strip_tags($this->meios_pagamento));
        $this->anotacoes_internas = htmlspecialchars(strip_tags($this->anotacoes_internas));
        $this->valor_total = htmlspecialchars(strip_tags($this->valor_total));
        $this->status = htmlspecialchars(strip_tags($this->status));

        // Vincular valores
        $stmt->bindParam(":empresa_id", $this->empresa_id);
        $stmt->bindParam(":cliente_id", $this->cliente_id);
        $stmt->bindParam(":usuario_id", $this->usuario_id);
        $stmt->bindParam(":numero_orcamento", $this->numero_orcamento);
        $stmt->bindParam(":referencia", $this->referencia);
        $stmt->bindParam(":data_orcamento", $this->data_orcamento);
        $stmt->bindParam(":validade_orcamento", $this->validade_orcamento);
        $stmt->bindParam(":prazo_inicio", $this->prazo_inicio);
        $stmt->bindParam(":prazo_duracao", $this->prazo_duracao);
        $stmt->bindParam(":observacoes", $this->observacoes);
        $stmt->bindParam(":imposto_percentual", $this->imposto_percentual);
        $stmt->bindParam(":frete", $this->frete);
        $stmt->bindParam(":desconto_valor", $this->desconto_valor);
        $stmt->bindParam(":desconto_percentual", $this->desconto_percentual);
        $stmt->bindParam(":tipo_desconto", $this->tipo_desconto);
        $stmt->bindParam(":condicoes_pagamento", $this->condicoes_pagamento);
        $stmt->bindParam(":meios_pagamento", $this->meios_pagamento);
        $stmt->bindParam(":anotacoes_internas", $this->anotacoes_internas);
        $stmt->bindParam(":valor_total", $this->valor_total);
        $stmt->bindParam(":status", $this->status);

        if ($stmt->execute()) {
            $this->id = $this->conn->lastInsertId();
            return true;
        }

        return false;
    }

    // Método para criar itens de orçamento
    public function createItem($item_data) {
        $query = "INSERT INTO orcamentos_itens
                SET
                    orcamento_id = :orcamento_id,
                    tipo_item = :tipo_item,
                    descricao = :descricao,
                    tipo_especifico = :tipo_especifico,
                    observacao = :observacao,
                    quantidade = :quantidade,
                    valor_unitario = :valor_unitario,
                    valor_total = :valor_total,
                    criado_em = NOW()";

        $stmt = $this->conn->prepare($query);

        // Limpar dados
        $item_data["orcamento_id"] = htmlspecialchars(strip_tags($item_data["orcamento_id"]));
        $item_data["tipo_item"] = htmlspecialchars(strip_tags($item_data["tipo_item"]));
        $item_data["descricao"] = htmlspecialchars(strip_tags($item_data["descricao"] ?? null));
        $item_data["tipo_especifico"] = htmlspecialchars(strip_tags($item_data["tipo_especifico"] ?? null));
        $item_data["observacao"] = htmlspecialchars(strip_tags($item_data["observacao"] ?? null));
        $item_data["quantidade"] = htmlspecialchars(strip_tags($item_data["quantidade"] ?? 0));
        $item_data["valor_unitario"] = htmlspecialchars(strip_tags($item_data["valor_unitario"] ?? 0));
        $item_data["valor_total"] = htmlspecialchars(strip_tags($item_data["valor_total"] ?? 0));

        // Vincular valores
        $stmt->bindParam(":orcamento_id", $item_data["orcamento_id"]);
        $stmt->bindParam(":tipo_item", $item_data["tipo_item"]);
        $stmt->bindParam(":descricao", $item_data["descricao"]);
        $stmt->bindParam(":tipo_especifico", $item_data["tipo_especifico"]);
        $stmt->bindParam(":observacao", $item_data["observacao"]);
        $stmt->bindParam(":quantidade", $item_data["quantidade"]);
        $stmt->bindParam(":valor_unitario", $item_data["valor_unitario"]);
        $stmt->bindParam(":valor_total", $item_data["valor_total"]);

        return $stmt->execute();
    }

    // Método para atualizar um orçamento
    public function update() {
        $query = "UPDATE " . $this->table_name . "
                SET
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
                WHERE
                    id = :id";

        $stmt = $this->conn->prepare($query);

        // Limpar dados
        $this->cliente_id = htmlspecialchars(strip_tags($this->cliente_id));
        $this->usuario_id = htmlspecialchars(strip_tags($this->usuario_id));
        $this->referencia = htmlspecialchars(strip_tags($this->referencia));
        $this->data_orcamento = htmlspecialchars(strip_tags($this->data_orcamento));
        $this->validade_orcamento = htmlspecialchars(strip_tags($this->validade_orcamento));
        $this->prazo_inicio = htmlspecialchars(strip_tags($this->prazo_inicio));
        $this->prazo_duracao = htmlspecialchars(strip_tags($this->prazo_duracao));
        $this->observacoes = htmlspecialchars(strip_tags($this->observacoes));
        $this->imposto_percentual = htmlspecialchars(strip_tags($this->imposto_percentual));
        $this->frete = htmlspecialchars(strip_tags($this->frete));
        $this->desconto_valor = htmlspecialchars(strip_tags($this->desconto_valor));
        $this->desconto_percentual = htmlspecialchars(strip_tags($this->desconto_percentual));
        $this->tipo_desconto = htmlspecialchars(strip_tags($this->tipo_desconto));
        $this->condicoes_pagamento = htmlspecialchars(strip_tags($this->condicoes_pagamento));
        $this->meios_pagamento = htmlspecialchars(strip_tags($this->meios_pagamento));
        $this->anotacoes_internas = htmlspecialchars(strip_tags($this->anotacoes_internas));
        $this->valor_total = htmlspecialchars(strip_tags($this->valor_total));
        $this->status = htmlspecialchars(strip_tags($this->status));
        $this->id = htmlspecialchars(strip_tags($this->id));

        // Vincular valores
        $stmt->bindParam(":cliente_id", $this->cliente_id);
        $stmt->bindParam(":usuario_id", $this->usuario_id);
        $stmt->bindParam(":referencia", $this->referencia);
        $stmt->bindParam(":data_orcamento", $this->data_orcamento);
        $stmt->bindParam(":validade_orcamento", $this->validade_orcamento);
        $stmt->bindParam(":prazo_inicio", $this->prazo_inicio);
        $stmt->bindParam(":prazo_duracao", $this->prazo_duracao);
        $stmt->bindParam(":observacoes", $this->observacoes);
        $stmt->bindParam(":imposto_percentual", $this->imposto_percentual);
        $stmt->bindParam(":frete", $this->frete);
        $stmt->bindParam(":desconto_valor", $this->desconto_valor);
        $stmt->bindParam(":desconto_percentual", $this->desconto_percentual);
        $stmt->bindParam(":tipo_desconto", $this->tipo_desconto);
        $stmt->bindParam(":condicoes_pagamento", $this->condicoes_pagamento);
        $stmt->bindParam(":meios_pagamento", $this->meios_pagamento);
        $stmt->bindParam(":anotacoes_internas", $this->anotacoes_internas);
        $stmt->bindParam(":valor_total", $this->valor_total);
        $stmt->bindParam(":status", $this->status);
        $stmt->bindParam(":id", $this->id);

        if ($stmt->execute()) {
            return true;
        }

        return false;
    }

    // Método para remover um orçamento (soft delete)
    public function delete() {
        $query = "UPDATE " . $this->table_name . " SET removido_em = NOW() WHERE id = ?";
        $stmt = $this->conn->prepare($query);
        $this->id = htmlspecialchars(strip_tags($this->id));
        $stmt->bindParam(1, $this->id);

        if ($stmt->execute()) {
            return true;
        }

        return false;
    }

    // Método para ler KPIs
    public function readKpis($empresa_id) {
        $query = "SELECT status, COUNT(*) as total FROM " . $this->table_name . " WHERE empresa_id = ? AND removido_em IS NULL GROUP BY status";
        $stmt = $this->conn->prepare($query);
        $stmt->execute([$empresa_id]);
        $results = $stmt->fetchAll(PDO::FETCH_ASSOC);

        $kpis = [
            'total_orcamentos' => 0,
            'rascunho' => 0,
            'pendente' => 0,
            'aprovado' => 0,
            'rejeitado' => 0,
            'cancelado' => 0
        ];

        foreach ($results as $row) {
            $status = strtolower($row['status']);
            $kpis['total_orcamentos'] += $row['total'];
            if (isset($kpis[$status])) {
                $kpis[$status] = $row['total'];
            }
        }

        return $kpis;
    }

    // NOVO MÉTODO: Obter e incrementar o próximo número de orçamento sequencial por empresa
    public function getAndIncrementNextNumeroOrcamento($empresa_id) {
        try {
            // 1. Obter o próximo número da tabela de empresas (sem lock)
            $query_select = "SELECT proximo_numero_orcamento FROM empresas WHERE id = :empresa_id";
            $stmt_select = $this->conn->prepare($query_select);
            $stmt_select->bindParam(':empresa_id', $empresa_id);
            
            if (!$stmt_select->execute()) {
                $errorInfo = $stmt_select->errorInfo();
                throw new Exception("Falha ao buscar o contador de orçamento da empresa. Detalhes: " . ($errorInfo[2] ?? 'N/A'));
            }

            $result = $stmt_select->fetch(PDO::FETCH_ASSOC);

            if (!$result) {
                // Verificar se a coluna existe, mas o valor é NULL
                $check_column_query = "SHOW COLUMNS FROM empresas LIKE 'proximo_numero_orcamento'";
                $column_exists = $this->conn->query($check_column_query)->fetch();

                if (!$column_exists) {
                     throw new Exception("A coluna 'proximo_numero_orcamento' não existe na tabela 'empresas'. Por favor, execute o script de migração do banco de dados.");
                }

                throw new Exception("Empresa com ID {$empresa_id} não encontrada ou o contador de orçamento não está inicializado (NULL).");
            }

            $proximo_sequencial = (int) $result['proximo_numero_orcamento'];
            $ano_atual = date('Y');
            $numero_orcamento_formatado = sprintf('%04d', $proximo_sequencial) . '/' . $ano_atual;

            // 2. Incrementar o contador na tabela de empresas
            $query_update = "UPDATE empresas SET proximo_numero_orcamento = proximo_numero_orcamento + 1 WHERE id = :empresa_id";
            $stmt_update = $this->conn->prepare($query_update);
            $stmt_update->bindParam(':empresa_id', $empresa_id);
            
            if (!$stmt_update->execute()) {
                $errorInfo = $stmt_update->errorInfo();
                throw new Exception("Falha ao incrementar o contador de orçamento. Detalhes: " . ($errorInfo[2] ?? 'N/A'));
            }

            return $numero_orcamento_formatado;

        } catch (Exception $e) {
            error_log("Erro ao obter e incrementar número de orçamento: " . $e->getMessage());
            throw $e; // Re-lançar a exceção para ser tratada no orcamentos.php
        }
    }
}

?>

