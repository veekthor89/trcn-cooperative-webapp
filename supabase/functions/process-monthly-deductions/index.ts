import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const now = new Date();
    const currentMonth = now.getMonth() + 1; // 1-11 for Jan-Nov
    const currentYear = now.getFullYear();

    // Only process January to November
    if (currentMonth > 11) {
      return new Response(
        JSON.stringify({ message: "Deductions only processed January-November" }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
      );
    }

    console.log(`Processing deductions for month ${currentMonth}, year ${currentYear}`);

    // Get all active contributions for current year
    const { data: contributions, error: contributionsError } = await supabase
      .from('special_contributions')
      .select('*')
      .eq('application_status', 'active')
      .eq('contribution_year', currentYear);

    if (contributionsError) {
      throw contributionsError;
    }

    let processed = 0;
    let skipped = 0;
    const errors: string[] = [];

    for (const contribution of contributions || []) {
      try {
        // Check if deduction already exists for this month
        const { data: existingDeduction } = await supabase
          .from('special_contribution_deductions')
          .select('id')
          .eq('contribution_id', contribution.id)
          .eq('deduction_month', currentMonth)
          .eq('deduction_year', currentYear)
          .maybeSingle();

        if (existingDeduction) {
          console.log(`Deduction already exists for contribution ${contribution.id}, month ${currentMonth}`);
          skipped++;
          continue;
        }

        // Create deduction record
        const { error: deductionError } = await supabase
          .from('special_contribution_deductions')
          .insert({
            contribution_id: contribution.id,
            user_id: contribution.user_id,
            deduction_month: currentMonth,
            deduction_year: currentYear,
            amount: contribution.monthly_amount,
            reference_number: `SC-${contribution.id.slice(0, 8)}-${currentYear}${currentMonth.toString().padStart(2, '0')}`
          });

        if (deductionError) {
          throw deductionError;
        }

        // Update contribution total_contributed
        const newTotalContributed = parseFloat(contribution.total_contributed || 0) + parseFloat(contribution.monthly_amount);
        
        const { error: updateError } = await supabase
          .from('special_contributions')
          .update({ 
            total_contributed: newTotalContributed,
            application_status: currentMonth === 11 ? 'completed' : 'active'
          })
          .eq('id', contribution.id);

        if (updateError) {
          throw updateError;
        }

        // Create notification
        const monthsRemaining = 11 - currentMonth;
        await supabase
          .from('notifications')
          .insert({
            user_id: contribution.user_id,
            type: 'contribution_deduction',
            message: `Monthly deduction of ₦${parseFloat(contribution.monthly_amount).toLocaleString()} processed for ${new Date().toLocaleString('default', { month: 'long' })} ${currentYear}. ${monthsRemaining > 0 ? `${monthsRemaining} month(s) remaining.` : 'Contribution completed!'}`
          });

        processed++;
        console.log(`Processed deduction for contribution ${contribution.id}`);
      } catch (error: any) {
        console.error(`Error processing contribution ${contribution.id}:`, error.message);
        errors.push(`Contribution ${contribution.id}: ${error.message}`);
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        processed,
        skipped,
        errors: errors.length > 0 ? errors : undefined,
        month: currentMonth,
        year: currentYear
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
    );
  } catch (error: any) {
    console.error('Error in process-monthly-deductions:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
    );
  }
});