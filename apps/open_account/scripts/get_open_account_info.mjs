import { coreFetch } from '../../../libs/core/Core.fetch.mjs'
import { GuestToken, Log } from '../../../libs/core/Core.function.mjs'

const guest_token = new GuestToken('android')
await guest_token.openAccountInit() // <- place the account object

const res = await coreFetch(
    'https://na.albtls.t.co/graphql/7Y7BnzBIuXcnn6LDO4H-uQ/ViewerUserQuery?variables=%7B%22includeTweetImpression%22%3Atrue%2C%22includeHasBirdwatchNotes%22%3Afalse%2C%22include_highlights_info%22%3Atrue%2C%22includeEditPerspective%22%3Afalse%2C%22includeEditControl%22%3Atrue%7D&features=%7B%22creator_subscriptions_subscription_count_enabled%22%3Atrue%2C%22super_follow_badge_privacy_enabled%22%3Atrue%2C%22graduated_access_invisible_treatment_enabled%22%3Atrue%2C%22subscriptions_verification_info_enabled%22%3Atrue%2C%22super_follow_user_api_enabled%22%3Atrue%2C%22blue_business_profile_image_shape_enabled%22%3Atrue%2C%22super_follow_exclusive_tweet_notifications_enabled%22%3Atrue%7D',
    guest_token.token,
    {},
    guest_token.token.authorization
)

Log(false, 'log', res, JSON.stringify(res.data, null, 4))
