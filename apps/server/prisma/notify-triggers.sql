-- LISTEN/NOTIFY trigger function for realtime broadcasts
CREATE OR REPLACE FUNCTION notify_table_change()
RETURNS TRIGGER AS $$
DECLARE
  payload JSON;
  record_id TEXT;
BEGIN
  IF TG_OP = 'DELETE' THEN
    record_id := OLD.id;
    payload := json_build_object(
      'table', TG_TABLE_NAME,
      'operation', TG_OP,
      'id', record_id
    );
  ELSE
    record_id := NEW.id;
    payload := json_build_object(
      'table', TG_TABLE_NAME,
      'operation', TG_OP,
      'id', record_id,
      'data', row_to_json(NEW)
    );
  END IF;

  PERFORM pg_notify('db_change', payload::text);
  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

-- Apply triggers to all relevant tables
CREATE OR REPLACE TRIGGER ideas_change AFTER INSERT OR UPDATE OR DELETE ON ideas FOR EACH ROW EXECUTE FUNCTION notify_table_change();
CREATE OR REPLACE TRIGGER votes_change AFTER INSERT OR UPDATE OR DELETE ON votes FOR EACH ROW EXECUTE FUNCTION notify_table_change();
CREATE OR REPLACE TRIGGER comments_change AFTER INSERT OR UPDATE OR DELETE ON comments FOR EACH ROW EXECUTE FUNCTION notify_table_change();
CREATE OR REPLACE TRIGGER notifications_change AFTER INSERT ON notifications FOR EACH ROW EXECUTE FUNCTION notify_table_change();
CREATE OR REPLACE TRIGGER surveys_change AFTER INSERT ON surveys FOR EACH ROW EXECUTE FUNCTION notify_table_change();
CREATE OR REPLACE TRIGGER survey_votes_change AFTER INSERT OR DELETE ON survey_votes FOR EACH ROW EXECUTE FUNCTION notify_table_change();
CREATE OR REPLACE TRIGGER survey_ratings_change AFTER INSERT OR UPDATE ON survey_ratings FOR EACH ROW EXECUTE FUNCTION notify_table_change();
CREATE OR REPLACE TRIGGER sprints_change AFTER INSERT OR UPDATE ON sprints FOR EACH ROW EXECUTE FUNCTION notify_table_change();
CREATE OR REPLACE TRIGGER statuses_change AFTER INSERT OR UPDATE OR DELETE ON statuses FOR EACH ROW EXECUTE FUNCTION notify_table_change();
CREATE OR REPLACE TRIGGER categories_change AFTER INSERT OR UPDATE OR DELETE ON categories FOR EACH ROW EXECUTE FUNCTION notify_table_change();
