# AI Product Recommendations Guide

## Overview

The AI Product Recommendations feature uses Claude AI to suggest relevant products for customer orders based on historical purchase patterns, sample tastings, customer notes, and current order context. Save time, increase order size, and introduce customers to products they'll love.

## How AI Recommendations Work

### What the AI Considers

The AI analyzes multiple data points to generate recommendations:

1. **Current Order Contents**
   - What products are already in the cart
   - Styles, categories, price points
   - Volume and variety in the order

2. **Customer Purchase History**
   - Past orders and frequencies
   - Favorite products and categories
   - Seasonal buying patterns
   - Price sensitivity and volume

3. **Sample Tastings**
   - Products the customer has tasted
   - Their feedback on samples
   - Samples that converted to orders
   - Products they expressed interest in but haven't ordered

4. **Customer Notes & Activities**
   - Logged conversations and preferences
   - Special requests and constraints
   - Upcoming events or menu changes
   - Sales rep notes on customer tastes

5. **Product Relationships**
   - Complementary wines (whites with reds, rosés for summer)
   - Similar styles from different producers
   - Premium alternatives to current selections
   - Value options in preferred categories

### Recommendation Engine

**Powered by**: Anthropic Claude AI
**Model**: Claude 3.5 Sonnet (or configured model)

**The AI uses**:
- Natural language understanding of customer preferences
- Pattern recognition across purchase history
- Contextual awareness of current order
- Industry knowledge of wine pairings and styles
- Your product catalog and inventory

## Using Recommendations

### Accessing Recommendations

**During Order Creation**:
1. Navigate to a customer's order page
2. Add initial products to the cart
3. Click **"Get AI Recommendations"** button
4. Review suggested products

**From Customer Detail Page**:
1. Navigate to customer profile
2. Click **"Recommendations"** tab
3. View AI-suggested products for next order

### Understanding Recommendation Results

**Each recommendation includes**:

- **Product Name & SKU**
- **Confidence Score**: 0-100% (how confident the AI is)
- **Reasoning**: Why the AI recommends this product
- **Suggested Quantity**: Recommended order quantity
- **Price**: Current pricing
- **Stock Status**: In stock / low stock / out of stock
- **Actions**: Add to cart, View details, Dismiss

**Example Recommendation**:
```
🍷 Product: Domaine Leflaive Puligny-Montrachet 2021
   SKU: LEFL-PM-2021
   Confidence: 87%

   Reasoning: "Customer frequently orders premium
   Burgundy whites and recently gave positive feedback
   on a similar Meursault sample. This Puligny-Montrachet
   complements their current order of red Burgundy and
   fits their typical $40-60 white wine price range."

   Suggested Quantity: 3 bottles
   Price: $52.99/bottle
   Stock: ✓ In Stock

   [Add to Order] [View Details] [Dismiss]
```

### Confidence Scores

**90-100%**: Very High Confidence
- Strong purchase history alignment
- Clear customer preferences
- Perfect fit with current order
- **Action**: Confidently suggest to customer

**70-89%**: High Confidence
- Good historical match
- Fits customer profile
- Logical addition to order
- **Action**: Recommend, explain reasoning

**50-69%**: Moderate Confidence
- Some supporting data
- Worth mentioning
- May need more context
- **Action**: Offer as option, gauge interest

**Below 50%**: Low Confidence
- Speculative suggestion
- Limited supporting data
- Test-the-waters recommendation
- **Action**: Use cautiously or skip

### Adding Recommendations to Orders

**Quick Add**:
1. Review recommendation
2. Click **"Add to Order"**
3. Product and suggested quantity added to cart
4. Adjust quantity if needed

**Custom Add**:
1. Click **"View Details"**
2. Review full product information
3. Adjust quantity
4. Click **"Add to Order"**

**Bulk Add**:
1. Select multiple recommendations (checkboxes)
2. Click **"Add Selected to Order"**
3. All selected products added at once

## Recommendation Strategies

### Cross-Selling

**AI identifies complementary products**:

**Example**:
- Customer orders Pinot Noir
- AI recommends Chardonnay from same region
- Reasoning: "Round out their Burgundy selection"

**Best Practice**:
- "I see you're ordering the Volnay. Have you tried the Meursault from the same producer? It's a perfect pairing."

### Upselling

**AI suggests premium alternatives**:

**Example**:
- Customer orders $25 Chablis
- AI recommends $42 Premier Cru Chablis
- Reasoning: "Similar style, higher quality, within price range customer has purchased before"

**Best Practice**:
- "You enjoy the regular Chablis - the Premier Cru version is exceptional and I know it's in your wheelhouse based on past orders."

### Discovery

**AI introduces new products aligned with preferences**:

**Example**:
- Customer regularly orders Italian reds
- AI recommends an Etna Rosso (new to them)
- Reasoning: "Similar profile to their Barolo preference, trending category, appropriate price point"

**Best Practice**:
- "Based on your love of Nebbiolo, I think you'd really enjoy this Etna Rosso. It has that same elegance and structure."

### Seasonal Suggestions

**AI adjusts for time of year**:

**Example (Spring)**:
- Customer orders year-round
- AI emphasizes rosés and light whites
- Reasoning: "Seasonal demand approaching, customer has ordered rosés every April-June"

**Best Practice**:
- "Summer's coming - based on past years, you'll want to stock up on rosé soon. These are my AI-recommended picks for you."

### Reorder Reminders

**AI notices missing regulars**:

**Example**:
- Customer normally orders Sancerre
- Current order doesn't include it
- AI recommends adding Sancerre
- Reasoning: "Customer orders Sancerre every 2-3 weeks, none in current order"

**Best Practice**:
- "I notice you didn't include your usual Sancerre - still need some? Or are you overstocked?"

## Providing Feedback to the AI

### Thumbs Up / Thumbs Down

After each recommendation:
- **👍 Thumbs Up**: Good recommendation, customer interested
- **👎 Thumbs Down**: Poor recommendation, not a fit

**AI learns from feedback**:
- Improves future recommendations
- Adjusts confidence scoring
- Refines customer profile understanding

### Detailed Feedback

Click **"Why is this wrong?"** to provide specifics:
- **Not interested in this style**: Adjust style preferences
- **Price too high**: Refine price range understanding
- **Already overstocked**: Inventory awareness
- **Customer doesn't like this producer**: Producer preferences
- **Other**: Free-text explanation

### Positive Feedback Details

Click **"Why is this great?"** to reinforce:
- **Perfect fit**: Confirm the logic
- **Customer loved it**: Strengthen recommendation
- **Great timing**: Seasonal awareness
- **New discovery**: Encourage similar suggestions

## API Setup

### Prerequisites

- Administrative access to tenant settings
- Anthropic API account
- API key with sufficient credits

### Configuration

**Step 1: Get Anthropic API Key**
1. Visit https://console.anthropic.com
2. Sign up or log in
3. Navigate to API Keys
4. Create new key
5. Copy the key (starts with `sk-ant-...`)

**Step 2: Add Key to Environment**

**For Hosted/Cloud**:
1. Log into admin panel
2. Navigate to **Settings > Integrations > AI**
3. Paste API key in **"Anthropic API Key"** field
4. Click **"Test Connection"**
5. If successful, click **"Save"**

**For Self-Hosted**:
1. Edit `.env` file
2. Add: `ANTHROPIC_API_KEY=sk-ant-your-key-here`
3. Restart application
4. Verify in admin panel

**Step 3: Configure AI Settings**

1. **Admin > Settings > AI Recommendations**
2. Set preferences:
   - **Model**: Claude 3.5 Sonnet (recommended)
   - **Max Recommendations**: 5-10
   - **Min Confidence**: 50%
   - **Include Out of Stock**: No (recommended)
   - **Context Window**: Last 12 months (default)

3. Click **"Save Settings"**

### Testing the Setup

1. Navigate to any customer with order history
2. Create a new order
3. Add a product to cart
4. Click **"Get AI Recommendations"**
5. Verify recommendations appear

**If recommendations don't appear**:
- Check API key is valid (Admin > AI Settings)
- Verify customer has sufficient history
- Check browser console for errors
- Contact support if issue persists

## Understanding Limitations

### When AI Might Not Have Suggestions

**Scenarios**:
1. **New Customer**: No purchase history to analyze
2. **Single Product Customer**: Limited data points
3. **Very Unique Preferences**: No comparable products in catalog
4. **Inventory Constraints**: All logical recommendations out of stock
5. **API Issues**: Temporary connection problems

**What to do**:
- Manually suggest products based on your expertise
- Use filtering and search to find alternatives
- Build purchase history for better future recommendations
- Check inventory levels for recommended categories

### Accuracy Considerations

**AI is not perfect**:
- Recommendations are probabilistic, not guaranteed fits
- Context may be misunderstood (e.g., one-time special event order)
- Seasonal patterns may shift
- Customer preferences change

**Best Practice**:
- **Use AI as a tool**, not a replacement for sales expertise
- **Combine AI suggestions with your knowledge** of the customer
- **Verify recommendations** before presenting to customer
- **Provide feedback** to improve accuracy over time

### Privacy and Data Usage

**What data is sent to Anthropic**:
- Customer purchase history (anonymized)
- Sample feedback
- Sales rep notes (only relevant excerpts)
- Current order contents
- Product catalog information

**What is NOT sent**:
- Customer names or identifying information
- Payment information
- Full customer database
- Other customers' data

**Data retention**:
- API requests are not stored by Anthropic beyond 30 days
- No training on your data (per Anthropic's commercial terms)
- Your data remains private and secure

### Cost Management

**API Costs**:
- Charged per recommendation request
- Typical cost: $0.01-0.05 per recommendation batch
- Monthly costs depend on usage volume

**Cost Control**:
1. **Admin > Settings > AI > Budget**
2. Set monthly budget cap: `$100` (example)
3. Enable alerts at 75% and 90% of budget
4. System will disable AI recommendations if budget exceeded

**Optimizing Costs**:
- Use recommendations selectively (high-value orders)
- Increase minimum confidence threshold (fewer, better suggestions)
- Cache recommendations for frequently ordered combinations
- Batch recommendations during order creation (not per product)

## Advanced Features

### Recommendation Caching

**How it works**:
- System caches recommendations for 24 hours
- If customer/context is similar, uses cached results
- Reduces API calls and costs
- Refreshes cache if new orders/samples logged

**Benefits**:
- Faster recommendation loading
- Lower API costs
- Consistent suggestions within a day

### Bulk Recommendations

**For proactive outreach**:
1. Navigate to **Sales > AI Recommendations > Bulk Generate**
2. Select customer segment (e.g., "Premium White Wine Buyers")
3. Click **"Generate Recommendations"**
4. System creates recommendation lists for all customers in segment
5. Export to CSV for email campaign or review

**Use Cases**:
- Monthly product highlights tailored to each customer
- New arrival announcements targeted to interested customers
- Seasonal recommendations sent proactively
- Restock reminders for regular orders

### Recommendation Scheduling

**Upcoming Feature**: Automated recommendation emails

**How it will work**:
1. Set schedule (e.g., every Monday 9am)
2. AI generates recommendations for customers due to re-order
3. Email sent to sales rep with suggested outreach list
4. Rep reviews and contacts customers

## Troubleshooting

### "No Recommendations Available"

**Possible Causes**:
- Customer has insufficient history
- All recommended products out of stock
- Current order too generic to generate meaningful suggestions
- API key not configured

**Solutions**:
- Manually suggest products based on expertise
- Add more context (samples, notes) to customer profile
- Check inventory levels
- Verify API configuration in Admin settings

### Recommendations Seem Off-Target

**Examples**:
- Suggesting reds to a white-only customer
- Price points way above customer's range
- Styles customer has never ordered

**Solutions**:
1. Provide **Thumbs Down feedback** with specifics
2. Review and update **customer preferences** in their profile
3. Verify **purchase history** is accurate
4. Check if customer had **one-off special orders** skewing data
5. Contact support to review AI logic if issue persists

### Slow Recommendation Loading

**Causes**:
- Large customer history (thousands of orders)
- Complex order context
- API latency
- Network issues

**Solutions**:
- Be patient (typically loads in 3-5 seconds)
- Reduce context window in AI settings (e.g., 6 months instead of 12)
- Check internet connection
- Try again if it times out

### API Key Errors

**Error Messages**:
- "Invalid API key"
- "API quota exceeded"
- "Unauthorized"

**Solutions**:
1. Verify API key in Admin > Settings > AI
2. Check Anthropic console for account status
3. Ensure API key has sufficient credits
4. Regenerate key if necessary

## Best Practices

### 1. Combine AI with Human Expertise

**AI suggests, you decide**:
- Review recommendations before presenting
- Add your context and knowledge
- Adjust quantities based on customer situation
- Explain the "why" behind each suggestion

### 2. Use for High-Value Orders

**Prioritize AI for**:
- Large orders (> $500)
- New customer first orders
- Monthly regulars with room to grow
- Customers actively exploring new products

**Manual approach for**:
- Small, simple reorders
- Single-SKU customers
- Clearly defined needs

### 3. Provide Consistent Feedback

**After every recommendation session**:
- Mark hits and misses
- Explain why recommendations were off
- Celebrate great suggestions

**Result**: AI improves over time, gets better at your customers

### 4. Keep Customer Profiles Updated

**AI is only as good as the data**:
- Log sample tastings promptly
- Add notes about customer preferences
- Update customer tags and categories
- Record conversations and preferences

**More data = Better recommendations**

### 5. Experiment and Iterate

**Try different approaches**:
- Use recommendations at different order stages
- Test upsell vs. cross-sell emphasis
- A/B test AI suggestions vs. manual suggestions
- Track which approach drives more revenue

### 6. Educate Customers

**If you share AI recommendations**:
- "Our system analyzed your past orders and suggested..."
- "Based on your Sancerre preference, it recommended..."
- Customers appreciate personalized, data-driven suggestions

## Related Documentation

- [Sample Management Guide](./SAMPLE_MANAGEMENT_GUIDE.md) - Sample tracking basics
- [Sample Analytics Guide](./SAMPLE_ANALYTICS_GUIDE.md) - Measure recommendation effectiveness
- [Samples Quick Reference](./SAMPLES_QUICK_REFERENCE.md) - Quick reference
- [API Reference](./API_REFERENCE.md) - AI recommendations API

## Support

- **In-app help**: Click the ? icon
- **API issues**: Check Anthropic status page
- **Feature requests**: Contact your admin
- **Training**: AI recommendations video in Help Center
- **Technical support**: support@yourcompany.com
