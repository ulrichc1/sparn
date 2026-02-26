# Privacy Policy

**Last Updated**: 2026-02-22
**Effective Date**: 2026-02-22
**Version**: 1.0

---

## 🔒 Your Privacy Matters

Sparn is a **local-only CLI tool** that respects your privacy. We believe your data belongs to you, which is why Sparn never sends your data anywhere.

---

## 📊 What Data Does Sparn Store?

All data is stored **locally on your machine** in the `.sparn/` directory within your project:

### 1. Context Content
- **What**: The AI agent context you choose to optimize
- **Where**: `.sparn/memory.db` (SQLite database)
- **Why**: To optimize and reduce token usage
- **Control**: You decide what content to optimize

### 2. Optimization Statistics
- **What**: Token counts, timestamps, performance metrics
- **Where**: `.sparn/memory.db` (SQLite database)
- **Why**: To track optimization effectiveness
- **Control**: View with `sparn stats`, delete with `sparn stats --reset`

### 3. Configuration
- **What**: Your preferences (theme, agent type, optimization settings)
- **Where**: `.sparn/config.yaml`
- **Why**: To customize Sparn's behavior
- **Control**: Edit with `sparn config` or text editor

### 4. Metadata
- **What**: Entry IDs, hashes, scores, timestamps
- **Where**: `.sparn/memory.db`
- **Why**: To manage memory lifecycle (decay, deduplication)
- **Control**: Managed automatically, visible in database

---

## 🚫 What Sparn Does NOT Do

We want to be crystal clear about what we **don't** do:

- ❌ **No Data Transmission**: Sparn NEVER sends data to external servers
- ❌ **No Telemetry**: We don't collect usage statistics or analytics
- ❌ **No Tracking**: No cookies, no tracking pixels, no fingerprinting
- ❌ **No Cloud Storage**: All data stays on your local machine
- ❌ **No Third-Party Sharing**: Your data never leaves your computer
- ❌ **No Personal Data Collection**: We don't collect names, emails, or identifiers
- ❌ **No Account Required**: No sign-up, no registration, no login

**Bottom line**: Sparn works 100% offline. You could disconnect from the internet and it would still work perfectly.

---

## 🔐 How Your Data is Protected

### Local-Only Architecture
- All processing happens on your machine
- Data never transmitted over the network
- No risk of server breaches or interception

### File System Permissions
- Data protected by your OS file permissions
- Only you (and programs you run) can access `.sparn/`
- Standard file system security applies

### Database Integrity
- SQLite database with ACID compliance
- Automatic corruption detection
- Timestamped backups on corruption

### No External Dependencies
- Doesn't require internet connection
- No API keys or credentials needed
- Self-contained processing

---

## 🎛️ Your Data, Your Control

You have **complete control** over your data:

### Access Your Data ✅
View everything Sparn stores:

```bash
# View database structure
sqlite3 .sparn/memory.db ".schema"

# View stored entries
sqlite3 .sparn/memory.db "SELECT id, timestamp, score, state FROM entries_index LIMIT 10;"

# View statistics
sparn stats --json

# View configuration
cat .sparn/config.yaml
```

### Export Your Data ✅
Take your data anywhere:

```bash
# Full database export (SQL format)
sqlite3 .sparn/memory.db .dump > sparn-backup.sql

# Export statistics (JSON format)
sparn stats --json > stats.json

# Copy entire directory
cp -r .sparn/ sparn-backup/
```

### Modify Your Data ✅
Change anything you want:

```bash
# Edit configuration
sparn config set pruning.threshold 10

# Or edit directly
nano .sparn/config.yaml

# Modify database (advanced)
sqlite3 .sparn/memory.db "UPDATE entries_index SET score = 1.0 WHERE isBTSP = 1;"
```

### Delete Your Data ✅
Remove data anytime:

```bash
# Delete all Sparn data (complete removal)
rm -rf .sparn/

# Delete old/decayed entries only
sparn consolidate

# Clear statistics only
sparn stats --reset

# Uninstall Sparn entirely
npm uninstall sparn
rm -rf .sparn/
```

---

## 🌍 GDPR & Privacy Regulations

### EU GDPR Compliance ✅

Sparn is **fully compliant** with the EU General Data Protection Regulation (GDPR):

#### Your Rights Under GDPR:
- ✅ **Right to Access** (Art. 15): Access all data in `.sparn/`
- ✅ **Right to Rectification** (Art. 16): Edit config or database
- ✅ **Right to Erasure** (Art. 17): Delete `.sparn/` directory
- ✅ **Right to Data Portability** (Art. 20): Export SQLite database
- ✅ **Right to Object** (Art. 21): Stop processing anytime

#### How Sparn Complies:
- **Data Minimization**: Only stores necessary data
- **Purpose Limitation**: Data used only for optimization
- **Storage Limitation**: TTL mechanism, automatic decay
- **Privacy by Design**: Local-only architecture
- **Security**: No transmission, file permissions, integrity checks

### Other Privacy Laws ✅
- 🇬🇧 **UK GDPR**: Compliant (same as EU GDPR)
- 🇺🇸 **California CCPA**: Compliant (no data collection)
- 🇧🇷 **Brazil LGPD**: Compliant (local-only processing)
- 🇨🇦 **Canada PIPEDA**: Compliant (no personal data)
- 🇦🇺 **Australia Privacy Act**: Compliant

**Why Sparn is Universally Compliant**: Local-only tools don't trigger most privacy regulations because there's no data collection, transmission, or third-party processing.

---

## ⚠️ Your Responsibilities

### When Using Sparn with Personal Data

If you choose to optimize context that contains **personal data** (names, emails, addresses, etc.), **you** are responsible for:

1. **Legal Basis**: Ensure you have the right to process this data
2. **Consent**: Obtain consent from data subjects if required
3. **Security**: Secure your machine and `.sparn/` directory
4. **Data Subject Rights**: Honor access/deletion requests from individuals
5. **Breach Notification**: Report breaches per applicable laws

**Example**: If you optimize customer support transcripts containing customer names and emails, you become the **data controller** and must comply with GDPR/privacy laws.

### Sparn's Role vs Your Role

- **Sparn (the tool)**: Provides local optimization functionality
- **You (the user)**: Decide what data to process and are responsible for compliance

This is similar to using Microsoft Word or Excel with personal data—the tool provider isn't responsible for your use of the tool.

### Best Practices

To minimize privacy risks:
- ✅ **Anonymize data** before optimization if possible
- ✅ **Remove PII** from context when not needed
- ✅ **Secure your machine** with encryption, passwords
- ✅ **Don't share** `.sparn/` directory with others
- ✅ **Regular cleanup** using `sparn consolidate`

---

## 🔄 Data Retention

### Automatic Data Management

Sparn uses **time-based decay** to automatically manage data:

1. **Time-to-Live (TTL)**: Entries have configurable lifespans
2. **Engram Decay**: Scores decrease over time (like memory fading)
3. **State Transitions**: Old entries become "silent" (not retrieved)
4. **Consolidation**: `sparn consolidate` removes fully decayed entries

### Manual Data Control

You can control retention:

```bash
# Remove old/decayed data
sparn consolidate

# Adjust decay rate (config)
sparn config set decay.defaultTTL 24  # 24 hours

# Clear everything
rm -rf .sparn/
```

### No Indefinite Storage

By design, Sparn doesn't keep data forever:
- Unused entries decay naturally
- Low-score entries are pruned during optimization
- Consolidation removes old data
- Database stays lean and efficient

---

## 🔍 Transparency

### Open Source

Sparn is **open source** (MIT License):
- View all code: https://github.com/ulrichc1/sparn
- Verify no data transmission
- Review security measures
- Contribute improvements

### No Hidden Behavior

What you see is what you get:
- No compiled binaries with hidden code
- No obfuscation
- No analytics libraries
- No network dependencies

### Audit Trail

You can audit Sparn's behavior:

```bash
# Monitor file system access
strace -e open,write sparn optimize -i input.txt

# Monitor network (you'll see ZERO network calls)
tcpdump -i any host sparn

# Check for loaded network libraries
lsof -p $(pgrep sparn) | grep socket
```

---

## 📧 Privacy Questions?

### General Privacy Questions
- **Open a Discussion**: https://github.com/ulrichc1/sparn/discussions
- **Read the Code**: https://github.com/ulrichc1/sparn
- **Review GDPR Compliance**: See GDPR-COMPLIANCE.md (internal doc)

### Security Concerns
- **Security Policy**: See SECURITY.md
- **Report Vulnerabilities**: GitHub Security Advisories

### Legal Questions
- **Consult a Lawyer**: For specific legal advice about your use case
- **Review GDPR**: https://gdpr-info.eu/

---

## 🔄 Changes to This Policy

We may update this Privacy Policy to reflect:
- New features or functionality
- Changes in privacy regulations
- User feedback and clarifications

**How We Notify You**:
- Version number updated in this document
- Change announced in release notes
- Commit history visible on GitHub

**Your Continued Use**: Using Sparn after policy changes means you accept the updated policy.

---

## 📜 Legal Disclaimer

This Privacy Policy describes how Sparn (the software tool) handles data. It does not constitute legal advice. If you use Sparn to process personal data, consult a qualified attorney about your obligations under applicable privacy laws.

**Tool Provider**: We provide Sparn as-is under the MIT License.
**Data Controller**: You (the user) are the data controller when you use Sparn.
**No Service Provider Relationship**: We don't provide data processing services.

---

## ✅ Summary

- 🔒 **100% Local**: All data stays on your machine
- 🚫 **Zero Tracking**: No telemetry, analytics, or tracking
- 🎛️ **Full Control**: You own and control all data
- ✅ **GDPR Compliant**: Respects all data protection regulations
- 🔓 **Open Source**: Transparent, auditable code
- 💾 **Your Responsibility**: You control what data you process

**Privacy Score**: 🌟🌟🌟🌟🌟 (5/5)

Sparn respects your privacy because your data never leaves your machine. Period.

---

**Questions?** Open a discussion on GitHub or review the source code.

**Effective Date**: 2026-02-22
**Version**: 1.0
**Last Updated**: 2026-02-22
