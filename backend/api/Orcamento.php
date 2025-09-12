<?php
class Orcamento{

    private $conn;
    private $table_name = "orcamentos";
    private $table_items_name = "orcamentos_itens";

    public $id;
    public $numero_orcamento;
    public $empresa_id;
    public $cliente_id;
    public $usuario_id;
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

    public $empresa_nome;
    public $cliente_nome;

    public function __construct($db){
        $this->conn = $db;
    }

    function read($filterStatus = "", $filterStartDate = "", $filterEndDate = ""){
        $query = "SELECT
                    o.id, o.numero_orcamento, o.empresa_id, o.cliente_id, o.usuario_id, o.referencia, o.data_orcamento,
                    o.validade_orcamento, o.prazo_inicio, o.prazo_duracao, o.observacoes, o.imposto_percentual,
                    o.frete, o.desconto_valor, o.desconto_percentual, o.tipo_desconto, o.condicoes_pagamento,
                    o.meios_pagamento, o.anotacoes_internas, o.valor_total, o.status, o.criado_em, o.atualizado_em, o.removido_em,
                    e.nome as empresa_nome, c.nome as cliente_nome
                FROM
                    " . $this->table_name . " o
                    LEFT JOIN
                        empresas e
                            ON o.empresa_id = e.id
                    LEFT JOIN
                        clientes c
                            ON o.cliente_id = c.id
                WHERE
                    o.removido_em IS NULL ";

        if (!empty($filterStatus)) {
            $query .= " AND o.status = :status";
        }
        if (!empty($filterStartDate)) {
            $query .= " AND o.data_orcamento >= :start_date";
        }
        if (!empty($filterEndDate)) {
            $query .= " AND o.data_orcamento <= :end_date";
        }

        $query .= " ORDER BY o.criado_em DESC";

        $stmt = $this->conn->prepare($query);

        if (!empty($filterStatus)) {
            $stmt->bindParam(":status", $filterStatus);
        }
        if (!empty($filterStartDate)) {
            $stmt->bindParam(":start_date", $filterStartDate);
        }
        if (!empty($filterEndDate)) {
            $stmt->bindParam(":end_date", $filterEndDate);
        }

        $stmt->execute();
        return $stmt;
    }

    function readOne(){
        $query = "SELECT
                    o.id, o.numero_orcamento, o.empresa_id, o.cliente_id, o.usuario_id, o.referencia, o.data_orcamento,
                    o.validade_orcamento, o.prazo_inicio, o.prazo_duracao, o.observacoes, o.imposto_percentual,
                    o.frete, o.desconto_valor, o.desconto_percentual, o.tipo_desconto, o.condicoes_pagamento,
                    o.meios_pagamento, o.anotacoes_internas, o.valor_total, o.status, o.criado_em, o.atualizado_em, o.removido_em,
                    e.nome as empresa_nome, c.nome as cliente_nome
                FROM
                    " . $this->table_name . " o
                    LEFT JOIN
                        empresas e
                            ON o.empresa_id = e.id
                    LEFT JOIN
                        clientes c
                            ON o.cliente_id = c.id
                WHERE
                    o.id = ?
                LIMIT
                    0,1";

        $stmt = $this->conn->prepare( $query );
        $stmt->bindParam(1, $this->id);
        $stmt->execute();

        $row = $stmt->fetch(PDO::FETCH_ASSOC);

        if ($row) {
            $this->numero_orcamento = $row["numero_orcamento"];
            $this->empresa_id = $row["empresa_id"];
            $this->cliente_id = $row["cliente_id"];
            $this->usuario_id = $row["usuario_id"];
            $this->referencia = $row["referencia"];
            $this->data_orcamento = $row["data_orcamento"];
            $this->validade_orcamento = $row["validade_orcamento"];
            $this->prazo_inicio = $row["prazo_inicio"];
            $this->prazo_duracao = $row["prazo_duracao"];
            $this->observacoes = $row["observacoes"];
            $this->imposto_percentual = $row["imposto_percentual"];
            $this->frete = $row["frete"];
            $this->desconto_valor = $row["desconto_valor"];
            $this->desconto_percentual = $row["desconto_percentual"];
            $this->tipo_desconto = $row["tipo_desconto"];
            $this->condicoes_pagamento = $row["condicoes_pagamento"];
            $this->meios_pagamento = $row["meios_pagamento"];
            $this->anotacoes_internas = $row["anotacoes_internas"];
            $this->valor_total = $row["valor_total"];
            $this->status = $row["status"];
            $this->criado_em = $row["criado_em"];
            $this->atualizado_em = $row["atualizado_em"];
            $this->removido_em = $row["removido_em"];
            $this->empresa_nome = $row["empresa_nome"];
            $this->cliente_nome = $row["cliente_nome"];
        }
    }

   function readKpis(){
    // A consulta original está correta
    $query = "SELECT status, COUNT(*) as count FROM " . $this->table_name . " WHERE removido_em IS NULL GROUP BY status";
    $stmt = $this->conn->prepare($query);
    $stmt->execute();

    $kpis = [];
    $total = 0;

    // Processa os resultados do banco
    while ($row = $stmt->fetch(PDO::FETCH_ASSOC)) {
        // Formata o nome do status para corresponder ao frontend (ex: 'Aguardando Aprovacao' -> 'aguardandoaprovacao')
        $status_key = strtolower(str_replace(' ', '', $row['status']));
        $kpis[$status_key] = (int)$row['count'];
        $total += (int)$row['count'];
    }
    
    // Adiciona o total ao array de KPIs
    $kpis["total"] = $total;

    // Retorna o array associativo diretamente
    return $kpis;
}
    function create(){
        $query = "INSERT INTO " . $this->table_name . "
                SET
                    numero_orcamento=:numero_orcamento, empresa_id=:empresa_id, cliente_id=:cliente_id, usuario_id=:usuario_id,
                    referencia=:referencia, data_orcamento=:data_orcamento, validade_orcamento=:validade_orcamento,
                    prazo_inicio=:prazo_inicio, prazo_duracao=:prazo_duracao, observacoes=:observacoes,
                    imposto_percentual=:imposto_percentual, frete=:frete, desconto_valor=:desconto_valor,
                    desconto_percentual=:desconto_percentual, tipo_desconto=:tipo_desconto, condicoes_pagamento=:condicoes_pagamento,
                    meios_pagamento=:meios_pagamento, anotacoes_internas=:anotacoes_internas, valor_total=:valor_total,
                    status=:status, criado_em=:criado_em";

        $stmt = $this->conn->prepare($query);

        $this->numero_orcamento=htmlspecialchars(strip_tags($this->numero_orcamento));
        $this->empresa_id=htmlspecialchars(strip_tags($this->empresa_id));
        $this->cliente_id=htmlspecialchars(strip_tags($this->cliente_id));
        $this->usuario_id=htmlspecialchars(strip_tags($this->usuario_id));
        $this->referencia=htmlspecialchars(strip_tags($this->referencia));
        $this->data_orcamento=htmlspecialchars(strip_tags($this->data_orcamento));
        $this->validade_orcamento=htmlspecialchars(strip_tags($this->validade_orcamento));
        $this->prazo_inicio=htmlspecialchars(strip_tags($this->prazo_inicio));
        $this->prazo_duracao=htmlspecialchars(strip_tags($this->prazo_duracao));
        $this->observacoes=htmlspecialchars(strip_tags($this->observacoes));
        $this->imposto_percentual=htmlspecialchars(strip_tags($this->imposto_percentual));
        $this->frete=htmlspecialchars(strip_tags($this->frete));
        $this->desconto_valor=htmlspecialchars(strip_tags($this->desconto_valor));
        $this->desconto_percentual=htmlspecialchars(strip_tags($this->desconto_percentual));
        $this->tipo_desconto=htmlspecialchars(strip_tags($this->tipo_desconto));
        $this->condicoes_pagamento=htmlspecialchars(strip_tags($this->condicoes_pagamento));
        $this->meios_pagamento=htmlspecialchars(strip_tags($this->meios_pagamento));
        $this->anotacoes_internas=htmlspecialchars(strip_tags($this->anotacoes_internas));
        $this->valor_total=htmlspecialchars(strip_tags($this->valor_total));
        $this->status=htmlspecialchars(strip_tags($this->status));

        $this->criado_em=date("Y-m-d H:i:s");

        $stmt->bindParam(":numero_orcamento", $this->numero_orcamento);
        $stmt->bindParam(":empresa_id", $this->empresa_id);
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
        $stmt->bindParam(":criado_em", $this->criado_em);

        if($stmt->execute()){
            $this->id = $this->conn->lastInsertId();
            return true;
        }
        return false;
    }

    function update(){
        $query = "UPDATE " . $this->table_name . "
                SET
                    numero_orcamento=:numero_orcamento, empresa_id=:empresa_id, cliente_id=:cliente_id, usuario_id=:usuario_id,
                    referencia=:referencia, data_orcamento=:data_orcamento, validade_orcamento=:validade_orcamento,
                    prazo_inicio=:prazo_inicio, prazo_duracao=:prazo_duracao, observacoes=:observacoes,
                    imposto_percentual=:imposto_percentual, frete=:frete, desconto_valor=:desconto_valor,
                    desconto_percentual=:desconto_percentual, tipo_desconto=:tipo_desconto, condicoes_pagamento=:condicoes_pagamento,
                    meios_pagamento=:meios_pagamento, anotacoes_internas=:anotacoes_internas, valor_total=:valor_total,
                    status=:status, atualizado_em=:atualizado_em
                WHERE
                    id = :id";

        $stmt = $this->conn->prepare($query);

        $this->numero_orcamento=htmlspecialchars(strip_tags($this->numero_orcamento));
        $this->empresa_id=htmlspecialchars(strip_tags($this->empresa_id));
        $this->cliente_id=htmlspecialchars(strip_tags($this->cliente_id));
        $this->usuario_id=htmlspecialchars(strip_tags($this->usuario_id));
        $this->referencia=htmlspecialchars(strip_tags($this->referencia));
        $this->data_orcamento=htmlspecialchars(strip_tags($this->data_orcamento));
        $this->validade_orcamento=htmlspecialchars(strip_tags($this->validade_orcamento));
        $this->prazo_inicio=htmlspecialchars(strip_tags($this->prazo_inicio));
        $this->prazo_duracao=htmlspecialchars(strip_tags($this->prazo_duracao));
        $this->observacoes=htmlspecialchars(strip_tags($this->observacoes));
        $this->imposto_percentual=htmlspecialchars(strip_tags($this->imposto_percentual));
        $this->frete=htmlspecialchars(strip_tags($this->frete));
        $this->desconto_valor=htmlspecialchars(strip_tags($this->desconto_valor));
        $this->desconto_percentual=htmlspecialchars(strip_tags($this->desconto_percentual));
        $this->tipo_desconto=htmlspecialchars(strip_tags($this->tipo_desconto));
        $this->condicoes_pagamento=htmlspecialchars(strip_tags($this->condicoes_pagamento));
        $this->meios_pagamento=htmlspecialchars(strip_tags($this->meios_pagamento));
        $this->anotacoes_internas=htmlspecialchars(strip_tags($this->anotacoes_internas));
        $this->valor_total=htmlspecialchars(strip_tags($this->valor_total));
        $this->status=htmlspecialchars(strip_tags($this->status));
        $this->id=htmlspecialchars(strip_tags($this->id));

        $this->atualizado_em=date("Y-m-d H:i:s");

        $stmt->bindParam(":numero_orcamento", $this->numero_orcamento);
        $stmt->bindParam(":empresa_id", $this->empresa_id);
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
        $stmt->bindParam(":atualizado_em", $this->atualizado_em);
        $stmt->bindParam(":id", $this->id);

        if($stmt->execute()){
            return true;
        }
        return false;
    }

    function delete(){
        $query = "UPDATE " . $this->table_name . " SET removido_em = :removido_em WHERE id = :id";

        $stmt = $this->conn->prepare($query);

        $this->id=htmlspecialchars(strip_tags($this->id));
        $this->removido_em=date("Y-m-d H:i:s");

        $stmt->bindParam(":id", $this->id);
        $stmt->bindParam(":removido_em", $this->removido_em);

        if($stmt->execute()){
            return true;
        }
        return false;
    }

    function readItems(){
        $query = "SELECT
                    id, orcamento_id, tipo_item, descricao, tipo_especifico, observacao, quantidade, valor_unitario, valor_total, criado_em
                FROM
                    " . $this->table_items_name . "
                WHERE
                    orcamento_id = ?
                ORDER BY
                    criado_em ASC";

        $stmt = $this->conn->prepare( $query );
        $stmt->bindParam(1, $this->id);
        $stmt->execute();

        $items_arr = array();
        while ($row = $stmt->fetch(PDO::FETCH_ASSOC)) {
            extract($row);
            $item = array(
                "id" => $id,
                "orcamento_id" => $orcamento_id,
                "tipo_item" => $tipo_item,
                "descricao" => $descricao,
                "tipo_especifico" => $tipo_especifico,
                "observacao" => $observacao,
                "quantidade" => $quantidade,
                "valor_unitario" => $valor_unitario,
                "valor_total" => $valor_total,
                "criado_em" => $criado_em
            );
            array_push($items_arr, $item);
        }
        return $items_arr;
    }

    function createItem($item){
        $query = "INSERT INTO " . $this->table_items_name . "
                SET
                    orcamento_id=:orcamento_id, tipo_item=:tipo_item, descricao=:descricao, tipo_especifico=:tipo_especifico,
                    observacao=:observacao, quantidade=:quantidade, valor_unitario=:valor_unitario, valor_total=:valor_total,
                    criado_em=:criado_em";

        $stmt = $this->conn->prepare($query);

        $item->orcamento_id=htmlspecialchars(strip_tags($item->orcamento_id));
        $item->tipo_item=htmlspecialchars(strip_tags($item->tipo_item));
        $item->descricao=htmlspecialchars(strip_tags($item->descricao));
        $item->tipo_especifico=htmlspecialchars(strip_tags($item->tipo_especifico));
        $item->observacao=htmlspecialchars(strip_tags($item->observacao));
        $item->quantidade=htmlspecialchars(strip_tags($item->quantidade));
        $item->valor_unitario=htmlspecialchars(strip_tags($item->valor_unitario));
        $item->valor_total=htmlspecialchars(strip_tags($item->valor_total));

        $item->criado_em=date("Y-m-d H:i:s");

        $stmt->bindParam(":orcamento_id", $item->orcamento_id);
        $stmt->bindParam(":tipo_item", $item->tipo_item);
        $stmt->bindParam(":descricao", $item->descricao);
        $stmt->bindParam(":tipo_especifico", $item->tipo_especifico);
        $stmt->bindParam(":observacao", $item->observacao);
        $stmt->bindParam(":quantidade", $item->quantidade);
        $stmt->bindParam(":valor_unitario", $item->valor_unitario);
        $stmt->bindParam(":valor_total", $item->valor_total);
        $stmt->bindParam(":criado_em", $item->criado_em);

        if($stmt->execute()){
            return true;
        }
        return false;
    }

    function deleteItemsByOrcamentoId($orcamento_id){
        $query = "DELETE FROM " . $this->table_items_name . " WHERE orcamento_id = ?";
        $stmt = $this->conn->prepare($query);
        $stmt->bindParam(1, $orcamento_id);
        if($stmt->execute()){
            return true;
        }
        return false;
    }
}
?>

