-- Script para adicionar suporte a soft delete na tabela assuntos

-- Adicionar coluna para rastrear exclusão lógica
ALTER TABLE assuntos 
ADD COLUMN removido_em DATETIME NULL DEFAULT NULL COMMENT 'Data/hora em que o assunto foi removido logicamente',
ADD COLUMN removido_por INT NULL COMMENT 'ID do usuário que removeu o assunto';

-- Adicionar índice para melhorar performance nas consultas com soft delete
ALTER TABLE assuntos ADD INDEX idx_assuntos_removido_em (removido_em);