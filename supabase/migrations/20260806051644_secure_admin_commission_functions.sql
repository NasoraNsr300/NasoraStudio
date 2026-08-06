alter function private.adjust_job_total(uuid, bigint, text, text, text)
  security definer;

alter function private.change_job_status(uuid, uuid, text, text)
  security definer;

alter function private.reorder_queue_entry(uuid, integer, text)
  security definer;
