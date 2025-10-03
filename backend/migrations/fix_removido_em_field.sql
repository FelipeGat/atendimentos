-- Remove o comportamento automático de 'on update current_timestamp()' do campo removido_em
ALTER TABLE empresas
MODIFY COLUMN removido_em timestamp NULL DEFAULT NULL;

-- Comentário explicativo:
-- Anteriormente, o campo removido_em estava configurado com 'on update current_timestamp()',
-- fazendo com que qualquer atualização na tabela preenchesse esse campo.
-- Agora, o campo só será preenchido quando explicitamente instruído via SQL.