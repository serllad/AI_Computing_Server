"""local_model: rename bleu→bleu_4, add rouge_1/rouge_2/rouge_l

Revision ID: local_model_metrics
Revises: update_time_default_align
Create Date: 2026-07-11
"""
from alembic import op
import sqlalchemy as sa

from bisheng.core.database.dialect_helpers import column_exists

revision = 'local_model_metrics'
down_revision = 'update_time_default_align'
branch_labels = None
depends_on = None


def upgrade():
    conn = op.get_bind()

    # create_missing_model_tables already creates local_model at its final
    # shape (bleu_4 present, no legacy bleu column), so only migrate tables
    # that still carry the old bleu column.
    if not column_exists(conn, 'local_model', 'bleu'):
        return
    if column_exists(conn, 'local_model', 'bleu_4'):
        return

    # Add new columns (nullable, so no backfill needed)
    op.add_column('local_model', sa.Column('bleu_4', sa.Float(), nullable=True, comment='BLEU-4分数'))
    op.add_column('local_model', sa.Column('rouge_1', sa.Float(), nullable=True, comment='ROUGE-1分数'))
    op.add_column('local_model', sa.Column('rouge_2', sa.Float(), nullable=True, comment='ROUGE-2分数'))
    op.add_column('local_model', sa.Column('rouge_l', sa.Float(), nullable=True, comment='ROUGE-L分数'))

    # Copy data from old bleu column to bleu_4
    op.execute("UPDATE local_model SET bleu_4 = bleu WHERE bleu IS NOT NULL")

    # Drop old bleu column
    op.drop_column('local_model', 'bleu')


def downgrade():
    conn = op.get_bind()

    if not column_exists(conn, 'local_model', 'bleu_4'):
        return

    if not column_exists(conn, 'local_model', 'bleu'):
        op.add_column('local_model', sa.Column('bleu', sa.Float(), nullable=True, comment='BLEU分数'))
    op.execute("UPDATE local_model SET bleu = bleu_4 WHERE bleu_4 IS NOT NULL")
    op.drop_column('local_model', 'bleu_4')
    op.drop_column('local_model', 'rouge_1')
    op.drop_column('local_model', 'rouge_2')
    op.drop_column('local_model', 'rouge_l')
