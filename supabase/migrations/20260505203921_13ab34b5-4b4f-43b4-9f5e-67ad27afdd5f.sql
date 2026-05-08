
ALTER TABLE public.pain_library ADD COLUMN sub_group text;

UPDATE public.pain_library SET sub_group = CASE pain_id
  WHEN 'P01' THEN 'time'
  WHEN 'P02' THEN 'inefficiency'
  WHEN 'P03' THEN 'inefficiency'
  WHEN 'P04' THEN 'direct_cost_saving'
  WHEN 'P05' THEN 'time'
  WHEN 'P06' THEN 'time'
  WHEN 'P07' THEN 'time'
  WHEN 'P08' THEN 'time'
  WHEN 'P09' THEN 'inefficiency'
  WHEN 'P10' THEN 'time'
  WHEN 'P11' THEN 'time'
  WHEN 'P12' THEN 'inefficiency'
  WHEN 'P13' THEN 'inefficiency'
  WHEN 'P14' THEN 'time'
  WHEN 'P15' THEN 'direct_cost_saving'
  WHEN 'P16' THEN 'time'
  WHEN 'P17' THEN 'inefficiency'
  WHEN 'P18' THEN 'time'
  WHEN 'P19' THEN 'inefficiency'
  WHEN 'P20' THEN 'direct_cost_saving'
  WHEN 'P21' THEN 'inefficiency'
  WHEN 'P22' THEN 'direct_cost_saving'
END;
