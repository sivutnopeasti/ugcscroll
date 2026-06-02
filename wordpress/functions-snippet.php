<?php
/**
 * UGC Suomi – Sync creator to Vercel/Supabase
 *
 * Add this code to your WordPress child theme's functions.php,
 * or to a site-specific plugin.
 *
 * CONFIGURATION: set these two constants in wp-config.php (or here):
 *   define('UGC_VERCEL_URL', 'https://ugc-scroll2.vercel.app');
 *   define('UGC_SYNC_SECRET', 'your-secret-string-matching-SYNC_SECRET-env-var');
 *
 * CPT SLUG: adjust UGC_CPT_SLUG if your custom post type slug differs.
 * ACF FIELD: adjust UGC_ACF_PREMIUM_FIELD to match your field name/key.
 */

define('UGC_CPT_SLUG',         'ugc_sisallontuottaja');
define('UGC_ACF_PREMIUM_FIELD', 'premium_tilaus_aktiivinen');

/**
 * Fires when a ugc_sisallontuottaja post is saved.
 * Sends creator data to the Next.js /api/sync-creator endpoint.
 */
add_action('save_post_' . UGC_CPT_SLUG, 'ugc_sync_creator_to_vercel', 20, 2);

function ugc_sync_creator_to_vercel(int $post_id, WP_Post $post): void {
    // Skip auto-saves and revisions
    if (defined('DOING_AUTOSAVE') && DOING_AUTOSAVE) return;
    if (wp_is_post_revision($post_id)) return;

    $vercel_url  = defined('UGC_VERCEL_URL')   ? UGC_VERCEL_URL   : '';
    $sync_secret = defined('UGC_SYNC_SECRET')  ? UGC_SYNC_SECRET  : '';

    if (empty($vercel_url) || empty($sync_secret)) {
        error_log('UGC Sync: UGC_VERCEL_URL or UGC_SYNC_SECRET not defined.');
        return;
    }

    // Resolve WP user associated with this post
    $wp_user_id = (int) $post->post_author;
    $user       = get_userdata($wp_user_id);
    if (! $user) {
        error_log("UGC Sync: no user found for post $post_id (author $wp_user_id).");
        return;
    }

    // Read premium status from ACF field (true/false or 1/0)
    $is_premium = false;
    if (function_exists('get_field')) {
        $raw        = get_field(UGC_ACF_PREMIUM_FIELD, $post_id);
        $is_premium = (bool) $raw;
    }

    $payload = [
        'wp_user_id'  => $wp_user_id,
        'wp_post_id'  => $post_id,
        'email'       => $user->user_email,
        'name'        => $post->post_title ?: $user->display_name,
        'is_premium'  => $is_premium,
    ];

    $response = wp_remote_post(
        trailingslashit($vercel_url) . 'api/sync-creator',
        [
            'timeout'     => 10,
            'headers'     => [
                'Content-Type'   => 'application/json',
                'X-Sync-Secret'  => $sync_secret,
            ],
            'body'        => wp_json_encode($payload),
            'data_format' => 'body',
        ]
    );

    if (is_wp_error($response)) {
        error_log('UGC Sync error: ' . $response->get_error_message());
    } else {
        $code = wp_remote_retrieve_response_code($response);
        $body = wp_remote_retrieve_body($response);
        error_log("UGC Sync: post $post_id → HTTP $code: $body");
    }
}
