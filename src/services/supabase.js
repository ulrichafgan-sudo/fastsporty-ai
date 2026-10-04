import { createClient } from "@supabase/supabase-js";

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || "https://sflxgegvfpytproyoyis.supabase.co";
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNmbHhnZWd2ZnB5dHByb3lveWlzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTA0MDYxNTMsImV4cCI6MjEwNTk4MjE1M30.K1IfugOEhibuvZsdCPA4suS5-FV9_2zSm56d8QlFuD4";

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true
  }
});

// Nettoyage automatique des anciens profils de démonstration du cache local
try {
  localStorage.removeItem("fastsporty_demo_profile");
} catch (e) {}

/**
 * Sign Up with email, password and username in Supabase
 */
export async function authSignUp({ email, password, username, language = "fr" }) {
  try {
    const cleanUsername = username?.trim() || email.split("@")[0];
    const { data, error } = await supabase.auth.signUp({
      email: email.trim(),
      password,
      options: {
        data: {
          username: cleanUsername,
          language
        }
      }
    });

    if (error) throw error;
    return { data, error: null };
  } catch (err) {
    return { data: null, error: err };
  }
}

/**
 * Sign In with email (or username) and password in Supabase
 */
export async function authSignIn({ email, password }) {
  try {
    let resolvedEmail = email.trim();
    if (!resolvedEmail.includes("@")) {
      const { data: foundEmail, error: rpcErr } = await supabase.rpc("get_email_by_identifier", {
        identifier: resolvedEmail
      });
      if (!rpcErr && foundEmail) {
        resolvedEmail = foundEmail;
      }
    }

    const { data, error } = await supabase.auth.signInWithPassword({
      email: resolvedEmail,
      password
    });

    if (error) throw error;
    return { data, error: null };
  } catch (err) {
    return { data: null, error: err };
  }
}

/**
 * Instant reset user password (supports email or username)
 */
export async function authResetPassword({ identifier, newPassword }) {
  try {
    let resolvedEmail = identifier.trim();
    if (!resolvedEmail.includes("@")) {
      const { data: foundEmail } = await supabase.rpc("get_email_by_identifier", {
        identifier: resolvedEmail
      });
      if (foundEmail) resolvedEmail = foundEmail;
    }

    const { data, error } = await supabase.rpc("reset_user_password", {
      target_email: resolvedEmail,
      new_plain_password: newPassword
    });

    if (error) throw error;
    if (!data) throw new Error("Compte introuvable pour cet identifiant.");
    return { success: true, email: resolvedEmail, error: null };
  } catch (err) {
    return { success: false, email: null, error: err };
  }
}

/**
 * Sign Out from Supabase
 */
export async function authSignOut() {
  try {
    const { error } = await supabase.auth.signOut();
    if (error) throw error;
    return { error: null };
  } catch (err) {
    return { error: err };
  }
}

/**
 * Get current session from Supabase
 */
export async function getAuthSession() {
  try {
    const { data: { session }, error } = await supabase.auth.getSession();
    if (error) throw error;
    return session;
  } catch (err) {
    console.warn("Could not get auth session:", err);
    return null;
  }
}

/**
 * Fetch real profile row from public.profiles for the logged in user
 */
export async function getUserProfile(userId) {
  try {
    if (!userId) {
      const session = await getAuthSession();
      userId = session?.user?.id;
    }
    if (!userId) return null;

    const { data, error } = await supabase
      .from("profiles")
      .select("*")
      .eq("id", userId)
      .maybeSingle();

    if (error) {
      console.warn("Could not fetch user profile:", error);
    }
    if (data) return data;

    // Fallback dynamique si le profil est en cours de création par le trigger Supabase
    const session = await getAuthSession();
    if (session?.user?.id === userId) {
      return {
        id: userId,
        username: session.user.user_metadata?.username || session.user.email.split("@")[0],
        public_id: "FS-" + userId.slice(0, 6).toUpperCase(),
        email: session.user.email,
        subscription_tier: "free",
        subscription_name: "Gratuit",
        subscription_days_remaining: 0,
        welcome_gift_claimed: false,
        created_at: new Date().toISOString()
      };
    }
    return null;
  } catch (err) {
    console.error("Error fetching profile:", err);
    return null;
  }
}

/**
 * Claim welcome gift in real Supabase database
 */
export async function claimWelcomeGift() {
  try {
    const session = await getAuthSession();
    if (!session?.user?.id) {
      return { success: false, message: "Veuillez vous connecter pour réclamer votre cadeau de bienvenue." };
    }

    // Appel direct au RPC sécurisé Supabase
    const { data: rpcRes, error: rpcErr } = await supabase.rpc("claim_welcome_gift");
    if (!rpcErr && rpcRes) {
      if (rpcRes.success === false) {
        return { success: false, message: rpcRes.error || "Cadeau déjà réclamé." };
      }
      return {
        success: true,
        message: "🎉 Cadeau de bienvenue activé ! Le coupon SAFE du jour est maintenant débloqué sans aucun flou !"
      };
    }

    // Fallback manuel si la procédure RPC n'est pas jointe
    const { data: profile } = await supabase
      .from("profiles")
      .select("welcome_gift_claimed")
      .eq("id", session.user.id)
      .maybeSingle();

    if (profile?.welcome_gift_claimed) {
      return { success: false, message: "Vous avez déjà réclamé votre cadeau de bienvenue !" };
    }

    await supabase
      .from("profiles")
      .update({ welcome_gift_claimed: true })
      .eq("id", session.user.id);

    return {
      success: true,
      message: "🎉 Cadeau de bienvenue activé ! Le coupon SAFE du jour est maintenant débloqué !"
    };
  } catch (err) {
    return { success: false, message: err.message || "Erreur lors de l'activation du cadeau." };
  }
}

/**
 * Vérifie si l'utilisateur connecté est un administrateur officiel
 */
export async function checkIfUserIsAdmin(userId) {
  try {
    if (!userId) return false;
    const { data, error } = await supabase
      .from("admin_users")
      .select("user_id")
      .eq("user_id", userId)
      .maybeSingle();
    return Boolean(data && !error);
  } catch (err) {
    return false;
  }
}

/**
 * Unlock 1 Rookie Special Coupon in real Supabase database
 */
export async function unlockRookieSpecialCoupon() {
  try {
    const session = await getAuthSession();
    if (!session?.user?.id) return false;
    await supabase
      .from("profiles")
      .update({ special_coupon_unlocked: true })
      .eq("id", session.user.id);
    return true;
  } catch (err) {
    console.error("Error unlocking rookie coupon:", err);
    return false;
  }
}

/**
 * Update user language in profile
 */
export async function updateProfileLanguage(lang) {
  try {
    const session = await getAuthSession();
    if (!session?.user?.id) return;

    await supabase
      .from("profiles")
      .update({ language: lang })
      .eq("id", session.user.id);
  } catch (err) {
    console.warn("Could not persist language to profile:", err);
  }
}

/**
 * Subscribe to real Supabase auth changes
 */
export function onAuthStateChange(callback) {
  return supabase.auth.onAuthStateChange((event, session) => {
    callback(event, session);
  });
}

/**
 * ==============================================================================
 * DATABASE OPERATIONS - COUPONS (GESTION BASE DE DONNÉES EN TEMPS RÉEL)
 * ==============================================================================
 */

/**
 * Fetch all coupons from Supabase database
 */
export async function fetchCouponsFromDb() {
  try {
    const { data, error } = await supabase
      .from("coupons")
      .select("*")
      .order("created_at", { ascending: false });

    if (error) throw error;
    if (!data || data.length === 0) return null;

    // Convert snake_case from DB to camelCase for the frontend
    return data.map(row => ({
      id: row.id,
      ticketRef: row.ticket_ref,
      title: row.title,
      type: row.type,
      category: row.category,
      isLocked: row.is_locked,
      totalOdds: parseFloat(row.total_odds),
      confidence: row.confidence,
      date: row.date,
      league: row.league,
      price: row.price,
      status: row.status,
      bookingCode: row.booking_code,
      bookmaker: row.bookmaker,
      stakeSuggestion: row.stake_suggestion,
      analysisSnippet: row.analysis_snippet,
      matches: row.matches || []
    }));
  } catch (err) {
    console.warn("Could not fetch coupons from Supabase, using fallback:", err);
    return null;
  }
}

/**
 * Save or update a coupon in Supabase
 */
export async function saveCouponToDb(coupon) {
  try {
    const row = {
      id: coupon.id,
      ticket_ref: coupon.ticketRef,
      title: coupon.title,
      type: coupon.type,
      category: coupon.category || (coupon.isLocked ? "safe" : "free"),
      is_locked: coupon.isLocked,
      total_odds: coupon.totalOdds,
      confidence: coupon.confidence,
      date: coupon.date,
      league: coupon.league,
      price: coupon.price || (coupon.isLocked ? "Inclus Abonnement" : "0.00€"),
      status: coupon.status || "pending",
      booking_code: coupon.bookingCode || "",
      bookmaker: coupon.bookmaker || "1xBet & Betclic",
      stake_suggestion: coupon.stakeSuggestion || "",
      analysis_snippet: coupon.analysisSnippet || "",
      matches: coupon.matches || [],
      updated_at: new Date().toISOString()
    };

    const { data, error } = await supabase
      .from("coupons")
      .upsert(row, { onConflict: "id" });

    if (error) throw error;
    return { data, error: null };
  } catch (err) {
    console.error("Error saving coupon to Supabase:", err);
    return { data: null, error: err };
  }
}

/**
 * Update coupon status (won / lost / pending) in Supabase
 */
export async function updateCouponStatusInDb(couponId, status) {
  try {
    const { data, error } = await supabase
      .from("coupons")
      .update({ status, updated_at: new Date().toISOString() })
      .eq("id", couponId);

    if (error) throw error;
    return { data, error: null };
  } catch (err) {
    console.error("Error updating coupon status in Supabase:", err);
    return { data: null, error: err };
  }
}

/**
 * Toggle coupon lock / VIP status in Supabase
 */
export async function toggleCouponLockInDb(couponId, isLocked) {
  try {
    const { data, error } = await supabase
      .from("coupons")
      .update({
        is_locked: isLocked,
        type: isLocked ? "VIP" : "FREE",
        updated_at: new Date().toISOString()
      })
      .eq("id", couponId);

    if (error) throw error;
    return { data, error: null };
  } catch (err) {
    console.error("Error toggling coupon lock in Supabase:", err);
    return { data: null, error: err };
  }
}

/**
 * Delete a coupon from Supabase
 */
export async function deleteCouponFromDb(couponId) {
  try {
    const { data, error } = await supabase
      .from("coupons")
      .delete()
      .eq("id", couponId);

    if (error) throw error;
    return { data, error: null };
  } catch (err) {
    console.error("Error deleting coupon from Supabase:", err);
    return { data: null, error: err };
  }
}

/**
 * ==============================================================================
 * DATABASE OPERATIONS - ADMINISTRATION UTILISATEURS & ABONNEMENTS
 * ==============================================================================
 */

/**
 * Fetch all registered users / profiles from Supabase
 */
export async function fetchAllUsersProfiles() {
  try {
    const { data, error } = await supabase
      .from("profiles")
      .select("*")
      .order("created_at", { ascending: false });

    if (error) throw error;
    return data || [];
  } catch (err) {
    console.error("Error fetching users from Supabase:", err);
    return [];
  }
}

/**
 * Update a user's subscription tier directly in Supabase
 */
export async function updateUserProfileSubscription(userId, { tier, name, daysRemaining }) {
  try {
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + (daysRemaining || 14));

    const { data, error } = await supabase
      .from("profiles")
      .update({
        subscription_tier: tier,
        subscription_name: name,
        subscription_days_remaining: daysRemaining,
        subscription_expires_at: expiresAt.toISOString(),
      })
      .eq("id", userId);

    if (error) throw error;
    return { data, error: null };
  } catch (err) {
    console.error("Error updating user subscription in Supabase:", err);
    return { data: null, error: err };
  }
}

/**
 * Fetch programs from Supabase
 */
export async function fetchProgramsFromDb() {
  try {
    const { data, error } = await supabase
      .from("programs")
      .select("*")
      .order("order_index", { ascending: true });

    if (error) throw error;
    return data || [];
  } catch (err) {
    console.warn("Error fetching programs from Supabase:", err);
    return [];
  }
}

/**
 * Create a new live program in Supabase
 */
export async function createProgramInDb(program) {
  try {
    const { data, error } = await supabase
      .from("programs")
      .insert([program]);

    if (error) throw error;
    return { data, error: null };
  } catch (err) {
    console.error("Error creating program in Supabase:", err);
    return { data: null, error: err };
  }
}

/**
 * Delete a program in Supabase
 */
export async function deleteProgramFromDb(id) {
  try {
    const { data, error } = await supabase
      .from("programs")
      .delete()
      .eq("id", id);

    if (error) throw error;
    return { data, error: null };
  } catch (err) {
    console.error("Error deleting program in Supabase:", err);
    return { data: null, error: err };
  }
}

/**
 * ==============================================================================
 * COMMUNITY REVIEWS / COMMENTS ON COUPONS & MATCHES
 * ==============================================================================
 */

/**
 * Fetch all comments for a specific match/coupon
 */
export async function fetchMatchComments(matchId) {
  try {
    const { data, error } = await supabase
      .from("coupon_comments")
      .select("*")
      .eq("match_id", String(matchId))
      .order("created_at", { ascending: false });

    if (error) throw error;
    return data || [];
  } catch (err) {
    console.warn(`Error fetching comments for match ${matchId}:`, err);
    return [];
  }
}

/**
 * Post a new comment for a match/coupon (Requires authenticated session)
 */
export async function createMatchComment({ matchId, comment, rating = 5 }) {
  try {
    const session = await getAuthSession();
    if (!session?.user) {
      throw new Error("Vous devez être connecté pour publier un avis.");
    }

    const profile = await getUserProfile(session.user.id);
    const userName = profile?.username || session.user.user_metadata?.username || session.user.email?.split("@")[0] || "Membre";
    const userInitials = (userName.length >= 2 ? userName.slice(0, 2) : "MB").toUpperCase();
    const userTier = profile?.subscription_tier || "free";

    const { data, error } = await supabase
      .from("coupon_comments")
      .insert([
        {
          match_id: String(matchId),
          user_id: session.user.id,
          user_name: userName,
          user_initials: userInitials,
          user_tier: userTier,
          comment: comment.trim(),
          rating: Number(rating) || 5
        }
      ])
      .select();

    if (error) throw error;
    return { data: data ? data[0] : null, error: null };
  } catch (err) {
    return { data: null, error: err };
  }
}

/**
 * Fetch all registered subscriptions from Supabase
 */
export async function fetchSubscriptionsFromDb() {
  try {
    const { data, error } = await supabase
      .from("subscriptions")
      .select("*")
      .order("created_at", { ascending: false });

    if (error) throw error;
    return data || [];
  } catch (err) {
    console.warn("Could not fetch subscriptions from Supabase:", err);
    return [];
  }
}
